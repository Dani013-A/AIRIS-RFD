#pragma once
#include <cstdint>
#include <string>
#include <unordered_map>

// IDs and sequence numbers are bridge metadata, never candidate text.
inline std::string airisSpeechField(const std::string& json, const std::string& key) {
    auto position = json.find("\"" + key + "\"");
    if (position == std::string::npos) return {};
    position = json.find(':', position + key.size() + 2);
    if (position == std::string::npos) return {};
    position = json.find_first_not_of(" \t\r\n", position + 1);
    if (position == std::string::npos) return {};
    if (json[position] == '"') ++position;
    std::string value;
    while (position < json.size() && value.size() < 128) {
        char c = json[position++];
        if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == ':')) break;
        value += c;
    }
    return value;
}
class AirisSpeechDelivery {
    uint64_t latest = 0;
    uint64_t active = 0;
    std::string id;
    bool answerExpected = true;
    std::unordered_map<const void*, uint64_t> coroutines;
public:
    bool begin(const std::string& payload) {
        auto nextId = airisSpeechField(payload, "utteranceId");
        auto digits = airisSpeechField(payload, "utteranceSequence");
        if (nextId.empty() || digits.empty() || digits.size() > 16) return false;
        uint64_t next = 0;
        for (char c : digits) {
            if (c < '0' || c > '9') return false;
            next = next * 10 + c - '0';
        }
        if (next <= latest || next > 9007199254740991ULL) return false;
        latest = active = next;
        id = nextId;
        answerExpected = airisSpeechField(payload, "closing") != "true";
        coroutines.clear();
        return true;
    }
    bool expectsAnswer() const { return answerExpected; }
    void attach(const void* coroutine) { coroutines[coroutine] = active; }
    bool current(const void* coroutine) const {
        auto found = coroutines.find(coroutine);
        return active != 0 && found != coroutines.end() && found->second == active;
    }
    std::string payload() const { return "{\"utteranceId\":\"" + id + "\"}"; }
    std::string complete(const void* coroutine) {
        if (!current(coroutine)) return {};
        auto result = payload();
        active = 0;
        coroutines.clear();
        return result;
    }
    void cancel() { active = 0; coroutines.clear(); }
};

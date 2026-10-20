# Native recording capture identity

`RecordingManager_StartRecording` increments a process-local monotonic `captureId` only after capture starts successfully. Unity adds this integer to `RECORDING_STARTED`, `RECORDING_STOPPED`, `NO_SPEECH`, and `TRANSCRIPT_READY` payloads. Existing fields, including `TRANSCRIPT_READY.transcript`, retain their meanings.

RN clears the expected ID whenever it requests a new recording. It accepts a newer `RECORDING_STARTED` ID only while listening, and accepts a handoff or silence/stop event only for that ID. A saved file is consumed once. Leaving the session invalidates outstanding transcription/evaluation generations.

The active UaaL StopRecording path saves and emits the WAV on the Unity thread before it can service a later START_RECORDING; it bypasses the legacy Unity transcription await path. This ordering is necessary for associating the ID with the saved file. The native patch and mobile reader must ship in the same APK. An older native library without captureId is incompatible with this reader and must fail artifact-integrity verification rather than being substituted.

FastAPI remains authoritative for evaluation and required question order. captureId is local lifecycle metadata, never identity, authorization, or a scoring input.

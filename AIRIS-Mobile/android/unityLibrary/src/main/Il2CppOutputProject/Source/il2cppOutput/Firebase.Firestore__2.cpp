#include "pch-cpp.hpp"





template <typename T1, typename T2, typename T3>
struct VirtualActionInvoker3
{
	typedef void (*Action)(void*,T1,T2,T3,const RuntimeMethod*);

	static inline void Invoke (Il2CppMethodSlot slot, RuntimeObject* obj, T1 p1, T2 p2, T3 p3)
	{
		const VirtualInvokeData& invokeData = il2cpp_codegen_get_virtual_invoke_data(slot, obj);
		((Action)invokeData.methodPtr)(obj,p1,p2,p3,invokeData.method);
	}
};
template <typename R>
struct VirtualFuncInvoker0
{
	typedef R (*Func)(void*,const RuntimeMethod*);

	static inline R Invoke (Il2CppMethodSlot slot, RuntimeObject* obj)
	{
		const VirtualInvokeData& invokeData = il2cpp_codegen_get_virtual_invoke_data(slot, obj);
		return ((Func)invokeData.methodPtr)(obj,invokeData.method);
	}
};
template <typename R, typename T1>
struct VirtualFuncInvoker1
{
	typedef R (*Func)(void*,T1,const RuntimeMethod*);

	static inline R Invoke (Il2CppMethodSlot slot, RuntimeObject* obj, T1 p1)
	{
		const VirtualInvokeData& invokeData = il2cpp_codegen_get_virtual_invoke_data(slot, obj);
		return ((Func)invokeData.methodPtr)(obj,p1,invokeData.method);
	}
};
template <typename R, typename T1, typename T2>
struct VirtualFuncInvoker2
{
	typedef R (*Func)(void*,T1,T2,const RuntimeMethod*);

	static inline R Invoke (Il2CppMethodSlot slot, RuntimeObject* obj, T1 p1, T2 p2)
	{
		const VirtualInvokeData& invokeData = il2cpp_codegen_get_virtual_invoke_data(slot, obj);
		return ((Func)invokeData.methodPtr)(obj,p1,p2,invokeData.method);
	}
};
struct InterfaceActionInvoker0
{
	typedef void (*Action)(void*,const RuntimeMethod*);

	static inline void Invoke (Il2CppMethodSlot slot, RuntimeClass* declaringInterface, RuntimeObject* obj)
	{
		const VirtualInvokeData& invokeData = il2cpp_codegen_get_interface_invoke_data(slot, obj, declaringInterface);
		((Action)invokeData.methodPtr)(obj,invokeData.method);
	}
};
template <typename R>
struct InterfaceFuncInvoker0
{
	typedef R (*Func)(void*,const RuntimeMethod*);

	static inline R Invoke (Il2CppMethodSlot slot, RuntimeClass* declaringInterface, RuntimeObject* obj)
	{
		const VirtualInvokeData& invokeData = il2cpp_codegen_get_interface_invoke_data(slot, obj, declaringInterface);
		return ((Func)invokeData.methodPtr)(obj,invokeData.method);
	}
};
template <typename R, typename T1>
struct InterfaceFuncInvoker1
{
	typedef R (*Func)(void*,T1,const RuntimeMethod*);

	static inline R Invoke (Il2CppMethodSlot slot, RuntimeClass* declaringInterface, RuntimeObject* obj, T1 p1)
	{
		const VirtualInvokeData& invokeData = il2cpp_codegen_get_interface_invoke_data(slot, obj, declaringInterface);
		return ((Func)invokeData.methodPtr)(obj,p1,invokeData.method);
	}
};

struct Dictionary_2_t7CC7577BE304ED34533E9BABC0EB2AA8A73D2BE8;
struct Dictionary_2_tB3BF685342B8A1AB5995EE46B7014CBC0B281D5C;
struct Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E;
struct Func_2_t9411B5EEDC5B4099FE9226A3C6B92CA846F8991D;
struct IDictionary_2_t6E45F1BFCF8907736E4E289E478607C9D311F2AA;
struct IDictionary_2_t035224085B86686A781D8AB3019CE2C9FD838FA6;
struct IEnumerable_1_t6686595E4CB7AC210F0EF075F7B1DD4A21D3902B;
struct IEnumerable_1_t6D5FFB1B4A97F30426C5D394135AD0D2FAEAE680;
struct IEqualityComparer_1_tAE94C8F24AD5B94D4EE85CA9FC59E3409D41CAF7;
struct IList_1_t3FDB0D8B9D905394F4726C8BD3890FD1B64393F1;
struct KeyCollection_t1420BAEB43E57D4307CD761B733F12BFA4308419;
struct List_1_tBA97A62E49F18775E9FBE6AAE127D28F79FA87CB;
struct List_1_t6959D78D53022948E65A4FDA6291D7F38FEFA02E;
struct ListenerRegistrationMap_1_t86C1C4A777AF595737DD7CE070E15B23120B62EF;
struct ValueCollection_t315C61B5770B270D960053646FE43503E622C8C2;
struct EntryU5BU5D_t59D59A96DC34F038BF97F6CCBF64B076DE13E022;
struct ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031;
struct CharU5BU5D_t799905CF001DD5F13F7DBB310181FC4D8B7D0AAB;
struct DelegateU5BU5D_tC5AB7E8F745616680F337909D3A8E6C722CDF771;
struct FieldValueProxyU5BU5D_tBF51F4AB40D42ED1E4C16E695B963A00ECCCE443;
struct Int32U5BU5D_t19C97395396A72ECAF310612F0760F165060314C;
struct IntPtrU5BU5D_tFD177F8C806A6921AD7150264CCC62FA00CAD832;
struct ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918;
struct StackTraceU5BU5D_t32FBCB20930EAF5BAE3F450FF75228E5450DA0DF;
struct TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB;
struct __CanonU5BU5D_tFF96AE6C231BB36A6CEE54CEEB72ED8E90201979;
struct ArgumentException_tAD90411542A20A9C72D5CDA3A84181D8B947A263;
struct Binder_t91BFCE95A7057FADF4D8A1A342AFE52872246235;
struct BlobConverter_t7A6588D9EF3D39EEC09A6193CDF832D15A2EBC6D;
struct BooleanConverter_t413CD06B6AFB2069B97F4F69B4D5B54A7103F43E;
struct ByteArrayConverter_tFC576D6F861A6A5D054DD2D1C14D90FD491309ED;
struct ByteConverter_tA676FFBC239BA57CE9A77C4CAE57A5ACA66679FC;
struct ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986;
struct DateTimeConverter_t414F0BA1D7E783E6AA182523D5A665E835379C4F;
struct DateTimeOffsetConverter_tAD4C59B3E28745F5A1E340FFE014D257CD29887F;
struct DelegateData_t9B286B493293CD2D23A5B2B5EF0E5B1324C2B77E;
struct DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E;
struct DocumentReference_t771D97F07262D859FCE27B0C344AB1E54F6FFFCF;
struct DocumentReferenceConverter_t77C4B95A6C934F7341FA4093848C74595B1926E5;
struct DocumentReferenceProxy_t2130D62C085B6D0F09E46550D38F9BD1EEBE0F7A;
struct DocumentSnapshot_tB7A99E6315793884C5227C22A024FF1E9444CC2F;
struct DoubleConverter_t6E78FF273149A7409508A304891B4322DDF611B4;
struct EnumConverter_tC42B4916096ABFBC0334B1581071DED58F25FC98;
struct EnumerableConverter_t3417703BE9D939EBD479C55B1E2AA576F807633F;
struct EnumerableConverterBase_tDF9B3A0A205608610843CF474E57F38B0154810C;
struct FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26;
struct FieldValueProxyConverter_t8075153C7E9CB3F49FE2D8F52755947F9751897F;
struct FieldValueVector_tC122E2EBD2D537A9B562AE821FBD088D90659ADE;
struct FirebaseFirestore_tAF16CB8787D9068C20C4BDC6D61F35AD0AF723A8;
struct GeoPointConverter_tC63DED3B80C043912E1370DE8FA78D76902967FF;
struct GeoPointProxy_t01FBB939675E91CACA5D94712514DA430CD46968;
struct IDictionary_t6D03155AF1FA9083817AA5B6AD7DEEACC26AB220;
struct IDisposable_t030E0496B4E0E4E4F086825007979AF51F7248C5;
struct IEnumerator_t7B609C2FFA6EB5167D9C62A0C32A21DE2F666DAA;
struct IFirestoreInternalConverter_tA4A86E49EE5CD2A63DF6F549484A126080771A44;
struct IList_t1C522956D79B7DC92B5B01053DF1AC058C8B598D;
struct Int16Converter_t7164A70E8D6EE2EA90E75205A9D842833F195E3B;
struct Int32Converter_t57F1559BACE26877F76CE073B9A5614C37377587;
struct Int64Converter_t68449D8D48F5695BD5DBB8BFD31257B5C8B20953;
struct IntegerConverterBase_tFD031194A307F60CD0CAB0368F8169B87D3B1749;
struct InvalidOperationException_t5DDE4D49B7405FAAB1E4576F4715A42A3FAD4BAB;
struct MapConverterBase_tB74722C6C09BD0135DB6428DBDCA720402A459E3;
struct MemberFilter_tF644F1AE82F611B677CE1964D5A3277DDA21D553;
struct MethodBase_t;
struct MethodInfo_t;
struct NotSupportedException_t1429765983D409BD2986508963C98D214E4EBF4A;
struct SByteConverter_t878367D86AB2143AC558AB69487A33F5FC3D7FD0;
struct SafeSerializationManager_tCBB85B95DFD1634237140CD892E82D06ECB3F5E6;
struct SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D;
struct SingleConverter_t5DB6880D844DEC4685528999AAF0F251516DE639;
struct String_t;
struct StringConverter_tE3ACF1666C7A43A5ED0ED035D3A21A4527EFF33A;
struct TimestampConverter_t334CE72D4B7105AA99405E53ADC81B5C4C246D1E;
struct TimestampProxy_t62B4D8B5017180CFD050625E52B3F07CB596BFC3;
struct Type_t;
struct UInt16Converter_tDC237C86A6C6C07A47254910EACA583EF49DCF97;
struct UInt32Converter_t37920E7844B75328507C6A82EB007A86F1892151;
struct UInt64Converter_tA7BED8E18DDF9AFC86E767A972832A7A820A566C;
struct Void_t4861ACF8F4594C3437BB48B6E56783494B843915;
struct U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904;
struct ListenerDelegate_tAE1235754123BEFDBA5A5392D62D732DEF5B32C6;
struct U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01;

IL2CPP_EXTERN_C RuntimeClass* ArgumentException_tAD90411542A20A9C72D5CDA3A84181D8B947A263_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* CustomConverter_tE9655FBD1B8934E0CC2B34C1A3EDA5D26BD217EE_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* Dictionary_2_t7CC7577BE304ED34533E9BABC0EB2AA8A73D2BE8_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* DocumentReference_t771D97F07262D859FCE27B0C344AB1E54F6FFFCF_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* FirestoreCpp_t1169FEBB415417F3CA93CB88454A962A09744644_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* GeoPoint_tACACE5A3D70BEDDF601A80CBCC66735A1D9A96E0_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* IDisposable_t030E0496B4E0E4E4F086825007979AF51F7248C5_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* IEnumerable_t6331596D5DD37C462B1B8D49CF6B319B00AB7131_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* IEnumerator_t7B609C2FFA6EB5167D9C62A0C32A21DE2F666DAA_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* IFirestoreInternalConverter_tA4A86E49EE5CD2A63DF6F549484A126080771A44_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* IList_t1C522956D79B7DC92B5B01053DF1AC058C8B598D_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* InvalidOperationException_t5DDE4D49B7405FAAB1E4576F4715A42A3FAD4BAB_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* List_1_tBA97A62E49F18775E9FBE6AAE127D28F79FA87CB_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* NotSupportedException_t1429765983D409BD2986508963C98D214E4EBF4A_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* TypeCode_tBEF9BE86C8BCF5A6B82F3381219738D27804EF79_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C RuntimeClass* U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_il2cpp_TypeInfo_var;
IL2CPP_EXTERN_C String_t* _stringLiteral43BCC5CF1748E4B040E97BC78BC339A37FC37CB6;
IL2CPP_EXTERN_C String_t* _stringLiteral463DC12B654027ACC00118CEE9908C874B745191;
IL2CPP_EXTERN_C String_t* _stringLiteral7268D3EF93898CD5B17AD842F414170F892D2E42;
IL2CPP_EXTERN_C String_t* _stringLiteral8F18A0B99520AFAE0A3B688FCBD668AF2225DB6D;
IL2CPP_EXTERN_C String_t* _stringLiteralA0ED9B677776CE9870AC154CB66E1B887B6E6A33;
IL2CPP_EXTERN_C String_t* _stringLiteralD05A5FA4C66534B6FE80FA93AE969DA32BB265D8;
IL2CPP_EXTERN_C const RuntimeMethod* ByteConverter_DeserializeInteger_m75366C8C52D7A8E3C45B7AD38DBAE758E8C0BA9A_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* CustomConverter_ForConverterType_mD9C37418754C136186C19D64AA64D69085934C50_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* Dictionary_2__ctor_mEFBE7A31B17F88B49904A09737C23C6D9489E210_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* EnumConverter_EnumToInt64_m826E2ADBA4100B79A4CBB08363CC5F6F7D195FFE_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* EnumConverter_Int64ToEnumBaseType_mFFF3896402AAB924DF0BAA7F5321BE5460F6AA71_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* EnumerableConverter_DeserializeArray_m3FE8044084F9036E98E38F94C8BE5770B9AB8EF9_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* Enumerable_FirstOrDefault_TisType_t_mB9171D7C79BDDA53104605F28E6DD2E02A864D61_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* Int16Converter_DeserializeInteger_mB51802CC353F9A8092891D6FC0FE1DE6BAD31A84_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* Int32Converter_DeserializeInteger_m0CBD454EA743313EF45C767D24B33D90CA1837D9_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* IntegerConverterBase_DeserializeDouble_mCD20BDEFC96DA44E122A69BF03A993BCA048B752_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* List_1_Add_mA15F138468E54860B5D7176DDD482A6AD1AEEE48_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* List_1__ctor_mA82BCBDC55CC01D88B9EE7A40D56AFD92FD5634E_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* SByteConverter_DeserializeInteger_m756B896D761C10275AE95BB4446D5872C5FD1AD7_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* U3CU3Ec_U3C_ctorU3Eb__1_0_mC65EA465ADE3F30333D7A4AD80443952B0BAAF40_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* UInt16Converter_DeserializeInteger_mBB92F046B498A47235E6D5C61E1D4DF5D139D71A_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* UInt32Converter_DeserializeInteger_m26885822BC645607B2FB01500B8173B823A3441A_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeMethod* UInt64Converter_DeserializeInteger_mC2073BA9F288A43CB50EDC0AF8D596DFD933F893_RuntimeMethod_var;
IL2CPP_EXTERN_C const RuntimeType* Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35_0_0_0_var;
IL2CPP_EXTERN_C const RuntimeType* ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031_0_0_0_var;
IL2CPP_EXTERN_C const RuntimeType* CustomConverter_tE9655FBD1B8934E0CC2B34C1A3EDA5D26BD217EE_0_0_0_var;
IL2CPP_EXTERN_C const RuntimeType* DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4_0_0_0_var;
IL2CPP_EXTERN_C const RuntimeType* DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D_0_0_0_var;
IL2CPP_EXTERN_C const RuntimeType* DocumentReference_t771D97F07262D859FCE27B0C344AB1E54F6FFFCF_0_0_0_var;
IL2CPP_EXTERN_C const RuntimeType* FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26_0_0_0_var;
IL2CPP_EXTERN_C const RuntimeType* FirestoreConverter_1_tC3DD0AD7A71139C5374F3250C18E115370EB4FEA_0_0_0_var;
IL2CPP_EXTERN_C const RuntimeType* GeoPoint_tACACE5A3D70BEDDF601A80CBCC66735A1D9A96E0_0_0_0_var;
IL2CPP_EXTERN_C const RuntimeType* IEnumerable_1_t6D39F4BC58A66D98BCEB112169CFDE48809FC555_0_0_0_var;
IL2CPP_EXTERN_C const RuntimeType* List_1_tA989C33995B015444AE843B573C94F683039E41F_0_0_0_var;
IL2CPP_EXTERN_C const RuntimeType* Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_0_0_0_var;
struct Delegate_t_marshaled_com;
struct Delegate_t_marshaled_pinvoke;
struct Exception_t_marshaled_com;
struct Exception_t_marshaled_pinvoke;

struct ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031;
struct ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918;
struct TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB;
struct __CanonU5BU5D_tFF96AE6C231BB36A6CEE54CEEB72ED8E90201979;

IL2CPP_EXTERN_C_BEGIN
IL2CPP_EXTERN_C_END

#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
struct Dictionary_2_t7CC7577BE304ED34533E9BABC0EB2AA8A73D2BE8  : public RuntimeObject
{
	Int32U5BU5D_t19C97395396A72ECAF310612F0760F165060314C* ____buckets;
	EntryU5BU5D_t59D59A96DC34F038BF97F6CCBF64B076DE13E022* ____entries;
	int32_t ____count;
	int32_t ____freeList;
	int32_t ____freeCount;
	int32_t ____version;
	RuntimeObject* ____comparer;
	KeyCollection_t1420BAEB43E57D4307CD761B733F12BFA4308419* ____keys;
	ValueCollection_t315C61B5770B270D960053646FE43503E622C8C2* ____values;
	RuntimeObject* ____syncRoot;
};
struct List_1_tBA97A62E49F18775E9FBE6AAE127D28F79FA87CB  : public RuntimeObject
{
	FieldValueProxyU5BU5D_tBF51F4AB40D42ED1E4C16E695B963A00ECCCE443* ____items;
	int32_t ____size;
	int32_t ____version;
	RuntimeObject* ____syncRoot;
};
struct List_1_t6959D78D53022948E65A4FDA6291D7F38FEFA02E  : public RuntimeObject
{
	__CanonU5BU5D_tFF96AE6C231BB36A6CEE54CEEB72ED8E90201979* ____items;
	int32_t ____size;
	int32_t ____version;
	RuntimeObject* ____syncRoot;
};
struct U3CPrivateImplementationDetailsU3E_tA33FA5CFD632B6289519017AA4220B8103FBB8CF  : public RuntimeObject
{
};
struct ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986  : public RuntimeObject
{
	Type_t* ___TargetType;
};
struct CustomConverter_tE9655FBD1B8934E0CC2B34C1A3EDA5D26BD217EE  : public RuntimeObject
{
};
struct DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E  : public RuntimeObject
{
	DocumentSnapshot_tB7A99E6315793884C5227C22A024FF1E9444CC2F* ___Snapshot;
};
struct DocumentReference_t771D97F07262D859FCE27B0C344AB1E54F6FFFCF  : public RuntimeObject
{
	DocumentReferenceProxy_t2130D62C085B6D0F09E46550D38F9BD1EEBE0F7A* ____proxy;
	FirebaseFirestore_tAF16CB8787D9068C20C4BDC6D61F35AD0AF723A8* ____firestore;
};
struct MemberInfo_t  : public RuntimeObject
{
};
struct SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D  : public RuntimeObject
{
	RuntimeObject* ____customConverters;
};
struct String_t  : public RuntimeObject
{
	int32_t ____stringLength;
	Il2CppChar ____firstChar;
};
struct ValueType_t6D9B272BD21782F0A9A14F2E41F85A50E97A986F  : public RuntimeObject
{
};
struct ValueType_t6D9B272BD21782F0A9A14F2E41F85A50E97A986F_marshaled_pinvoke
{
};
struct ValueType_t6D9B272BD21782F0A9A14F2E41F85A50E97A986F_marshaled_com
{
};
struct U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904  : public RuntimeObject
{
};
struct U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01  : public RuntimeObject
{
};
struct Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35 
{
	ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031* ____bytes;
	int32_t ____hash;
};
struct Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35_marshaled_pinvoke
{
	Il2CppSafeArray* ____bytes;
	int32_t ____hash;
};
struct Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35_marshaled_com
{
	Il2CppSafeArray* ____bytes;
	int32_t ____hash;
};
struct BlobConverter_t7A6588D9EF3D39EEC09A6193CDF832D15A2EBC6D  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
};
struct Boolean_t09A6377A54BE2F9E6985A8149F19234FD7DDFE22 
{
	bool ___m_value;
};
struct BooleanConverter_t413CD06B6AFB2069B97F4F69B4D5B54A7103F43E  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
};
struct Byte_t94D9231AC217BE4D2E004C4CD32DF6D099EA41A3 
{
	uint8_t ___m_value;
};
struct ByteArrayConverter_tFC576D6F861A6A5D054DD2D1C14D90FD491309ED  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
};
struct DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D 
{
	uint64_t ____dateData;
};
struct DateTimeConverter_t414F0BA1D7E783E6AA182523D5A665E835379C4F  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
};
struct DateTimeOffsetConverter_tAD4C59B3E28745F5A1E340FFE014D257CD29887F  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
};
struct DocumentReferenceConverter_t77C4B95A6C934F7341FA4093848C74595B1926E5  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
};
struct Double_tE150EF3D1D43DEE85D533810AB4C742307EEDE5F 
{
	double ___m_value;
};
struct DoubleConverter_t6E78FF273149A7409508A304891B4322DDF611B4  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
};
struct Enum_t2A1A94B24E3B776EEF4E5E485E290BB9D4D072E2  : public ValueType_t6D9B272BD21782F0A9A14F2E41F85A50E97A986F
{
};
struct Enum_t2A1A94B24E3B776EEF4E5E485E290BB9D4D072E2_marshaled_pinvoke
{
};
struct Enum_t2A1A94B24E3B776EEF4E5E485E290BB9D4D072E2_marshaled_com
{
};
struct EnumerableConverterBase_tDF9B3A0A205608610843CF474E57F38B0154810C  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
};
struct FieldValueProxyConverter_t8075153C7E9CB3F49FE2D8F52755947F9751897F  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
};
struct GeoPoint_tACACE5A3D70BEDDF601A80CBCC66735A1D9A96E0 
{
	union
	{
		#pragma pack(push, tp, 1)
		struct
		{
			double ____latitude;
		};
		#pragma pack(pop, tp)
		struct
		{
			double ____latitude_forAlignmentOnly;
		};
		#pragma pack(push, tp, 1)
		struct
		{
			char ____longitude_OffsetPadding[8];
			double ____longitude;
		};
		#pragma pack(pop, tp)
		struct
		{
			char ____longitude_OffsetPadding_forAlignmentOnly[8];
			double ____longitude_forAlignmentOnly;
		};
	};
};
struct GeoPointConverter_tC63DED3B80C043912E1370DE8FA78D76902967FF  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
};
struct Int16_tB8EF286A9C33492FA6E6D6E67320BE93E794A175 
{
	int16_t ___m_value;
};
struct Int32_t680FF22E76F6EFAD4375103CBBFFA0421349384C 
{
	int32_t ___m_value;
};
struct Int64_t092CFB123BE63C28ACDAF65C68F21A526050DBA3 
{
	int64_t ___m_value;
};
struct IntPtr_t 
{
	void* ___m_value;
};
struct IntegerConverterBase_tFD031194A307F60CD0CAB0368F8169B87D3B1749  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
};
struct MapConverterBase_tB74722C6C09BD0135DB6428DBDCA720402A459E3  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
};
struct MethodBase_t  : public MemberInfo_t
{
};
struct SByte_tFEFFEF5D2FEBF5207950AE6FAC150FC53B668DB5 
{
	int8_t ___m_value;
};
struct Single_t4530F2FF86FCB0DC29F35385CA1BD21BE294761C 
{
	float ___m_value;
};
struct SingleConverter_t5DB6880D844DEC4685528999AAF0F251516DE639  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
};
struct StringConverter_tE3ACF1666C7A43A5ED0ED035D3A21A4527EFF33A  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
};
struct Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3 
{
	int64_t ____seconds;
	int32_t ____nanoseconds;
};
struct TimestampConverter_t334CE72D4B7105AA99405E53ADC81B5C4C246D1E  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
};
struct UInt16_tF4C148C876015C212FD72652D0B6ED8CC247A455 
{
	uint16_t ___m_value;
};
struct UInt32_t1833D51FFA667B18A5AA4B8D34DE284F8495D29B 
{
	uint32_t ___m_value;
};
struct UInt64_t8F12534CC8FC4B5860F2A2CD1EE79D322E7A41AF 
{
	uint64_t ___m_value;
};
struct Void_t4861ACF8F4594C3437BB48B6E56783494B843915 
{
	union
	{
		struct
		{
		};
		uint8_t Void_t4861ACF8F4594C3437BB48B6E56783494B843915__padding[1];
	};
};
#pragma pack(push, tp, 1)
struct __StaticArrayInitTypeSizeU3D10_t97EF624521201C9BBDCAFDE9C34BB090702C7D37 
{
	union
	{
		struct
		{
			union
			{
			};
		};
		uint8_t __StaticArrayInitTypeSizeU3D10_t97EF624521201C9BBDCAFDE9C34BB090702C7D37__padding[10];
	};
};
#pragma pack(pop, tp)
struct BindingFlags_t5DC2835E4AE9C1862B3AD172EF35B6A5F4F1812C 
{
	int32_t ___value__;
};
struct ByteConverter_tA676FFBC239BA57CE9A77C4CAE57A5ACA66679FC  : public IntegerConverterBase_tFD031194A307F60CD0CAB0368F8169B87D3B1749
{
};
struct DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4 
{
	DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D ____dateTime;
	int16_t ____offsetMinutes;
};
struct Delegate_t  : public RuntimeObject
{
	intptr_t ___method_ptr;
	intptr_t ___invoke_impl;
	RuntimeObject* ___m_target;
	intptr_t ___method;
	intptr_t ___delegate_trampoline;
	intptr_t ___extra_arg;
	intptr_t ___method_code;
	intptr_t ___interp_method;
	intptr_t ___interp_invoke_impl;
	MethodInfo_t* ___method_info;
	MethodInfo_t* ___original_method_info;
	DelegateData_t9B286B493293CD2D23A5B2B5EF0E5B1324C2B77E* ___data;
	bool ___method_is_virtual;
};
struct Delegate_t_marshaled_pinvoke
{
	intptr_t ___method_ptr;
	intptr_t ___invoke_impl;
	Il2CppIUnknown* ___m_target;
	intptr_t ___method;
	intptr_t ___delegate_trampoline;
	intptr_t ___extra_arg;
	intptr_t ___method_code;
	intptr_t ___interp_method;
	intptr_t ___interp_invoke_impl;
	MethodInfo_t* ___method_info;
	MethodInfo_t* ___original_method_info;
	DelegateData_t9B286B493293CD2D23A5B2B5EF0E5B1324C2B77E* ___data;
	int32_t ___method_is_virtual;
};
struct Delegate_t_marshaled_com
{
	intptr_t ___method_ptr;
	intptr_t ___invoke_impl;
	Il2CppIUnknown* ___m_target;
	intptr_t ___method;
	intptr_t ___delegate_trampoline;
	intptr_t ___extra_arg;
	intptr_t ___method_code;
	intptr_t ___interp_method;
	intptr_t ___interp_invoke_impl;
	MethodInfo_t* ___method_info;
	MethodInfo_t* ___original_method_info;
	DelegateData_t9B286B493293CD2D23A5B2B5EF0E5B1324C2B77E* ___data;
	int32_t ___method_is_virtual;
};
struct EnumerableConverter_t3417703BE9D939EBD479C55B1E2AA576F807633F  : public EnumerableConverterBase_tDF9B3A0A205608610843CF474E57F38B0154810C
{
	Type_t* ____elementType;
};
struct Exception_t  : public RuntimeObject
{
	String_t* ____className;
	String_t* ____message;
	RuntimeObject* ____data;
	Exception_t* ____innerException;
	String_t* ____helpURL;
	RuntimeObject* ____stackTrace;
	String_t* ____stackTraceString;
	String_t* ____remoteStackTraceString;
	int32_t ____remoteStackIndex;
	RuntimeObject* ____dynamicMethods;
	int32_t ____HResult;
	String_t* ____source;
	SafeSerializationManager_tCBB85B95DFD1634237140CD892E82D06ECB3F5E6* ____safeSerializationManager;
	StackTraceU5BU5D_t32FBCB20930EAF5BAE3F450FF75228E5450DA0DF* ___captured_traces;
	IntPtrU5BU5D_tFD177F8C806A6921AD7150264CCC62FA00CAD832* ___native_trace_ips;
	int32_t ___caught_in_unmanaged;
};
struct Exception_t_marshaled_pinvoke
{
	char* ____className;
	char* ____message;
	RuntimeObject* ____data;
	Exception_t_marshaled_pinvoke* ____innerException;
	char* ____helpURL;
	Il2CppIUnknown* ____stackTrace;
	char* ____stackTraceString;
	char* ____remoteStackTraceString;
	int32_t ____remoteStackIndex;
	Il2CppIUnknown* ____dynamicMethods;
	int32_t ____HResult;
	char* ____source;
	SafeSerializationManager_tCBB85B95DFD1634237140CD892E82D06ECB3F5E6* ____safeSerializationManager;
	StackTraceU5BU5D_t32FBCB20930EAF5BAE3F450FF75228E5450DA0DF* ___captured_traces;
	Il2CppSafeArray* ___native_trace_ips;
	int32_t ___caught_in_unmanaged;
};
struct Exception_t_marshaled_com
{
	Il2CppChar* ____className;
	Il2CppChar* ____message;
	RuntimeObject* ____data;
	Exception_t_marshaled_com* ____innerException;
	Il2CppChar* ____helpURL;
	Il2CppIUnknown* ____stackTrace;
	Il2CppChar* ____stackTraceString;
	Il2CppChar* ____remoteStackTraceString;
	int32_t ____remoteStackIndex;
	Il2CppIUnknown* ____dynamicMethods;
	int32_t ____HResult;
	Il2CppChar* ____source;
	SafeSerializationManager_tCBB85B95DFD1634237140CD892E82D06ECB3F5E6* ____safeSerializationManager;
	StackTraceU5BU5D_t32FBCB20930EAF5BAE3F450FF75228E5450DA0DF* ___captured_traces;
	Il2CppSafeArray* ___native_trace_ips;
	int32_t ___caught_in_unmanaged;
};
struct HandleRef_t4B05E32B68797F702257D4E838B85A976313F08F 
{
	RuntimeObject* ____wrapper;
	intptr_t ____handle;
};
struct Int16Converter_t7164A70E8D6EE2EA90E75205A9D842833F195E3B  : public IntegerConverterBase_tFD031194A307F60CD0CAB0368F8169B87D3B1749
{
};
struct Int32Converter_t57F1559BACE26877F76CE073B9A5614C37377587  : public IntegerConverterBase_tFD031194A307F60CD0CAB0368F8169B87D3B1749
{
};
struct Int64Converter_t68449D8D48F5695BD5DBB8BFD31257B5C8B20953  : public IntegerConverterBase_tFD031194A307F60CD0CAB0368F8169B87D3B1749
{
};
struct MethodInfo_t  : public MethodBase_t
{
};
struct RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B 
{
	intptr_t ___value;
};
struct SByteConverter_t878367D86AB2143AC558AB69487A33F5FC3D7FD0  : public IntegerConverterBase_tFD031194A307F60CD0CAB0368F8169B87D3B1749
{
};
struct TypeCode_tBEF9BE86C8BCF5A6B82F3381219738D27804EF79 
{
	int32_t ___value__;
};
struct UInt16Converter_tDC237C86A6C6C07A47254910EACA583EF49DCF97  : public IntegerConverterBase_tFD031194A307F60CD0CAB0368F8169B87D3B1749
{
};
struct UInt32Converter_t37920E7844B75328507C6A82EB007A86F1892151  : public IntegerConverterBase_tFD031194A307F60CD0CAB0368F8169B87D3B1749
{
};
struct UInt64Converter_tA7BED8E18DDF9AFC86E767A972832A7A820A566C  : public IntegerConverterBase_tFD031194A307F60CD0CAB0368F8169B87D3B1749
{
};
struct Type_tEE9B27FAA8CA3C4B72C99B3AFE3839A70730D289 
{
	int32_t ___value__;
};
struct DocumentReferenceProxy_t2130D62C085B6D0F09E46550D38F9BD1EEBE0F7A  : public RuntimeObject
{
	HandleRef_t4B05E32B68797F702257D4E838B85A976313F08F ___swigCPtr;
	bool ___swigCMemOwn;
};
struct EnumConverter_tC42B4916096ABFBC0334B1581071DED58F25FC98  : public ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986
{
	int32_t ____typeCode;
};
struct FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26  : public RuntimeObject
{
	HandleRef_t4B05E32B68797F702257D4E838B85A976313F08F ___swigCPtr;
	bool ___swigCMemOwn;
};
struct FieldValueVector_tC122E2EBD2D537A9B562AE821FBD088D90659ADE  : public RuntimeObject
{
	HandleRef_t4B05E32B68797F702257D4E838B85A976313F08F ___swigCPtr;
	bool ___swigCMemOwn;
};
struct GeoPointProxy_t01FBB939675E91CACA5D94712514DA430CD46968  : public RuntimeObject
{
	HandleRef_t4B05E32B68797F702257D4E838B85A976313F08F ___swigCPtr;
	bool ___swigCMemOwn;
};
struct MulticastDelegate_t  : public Delegate_t
{
	DelegateU5BU5D_tC5AB7E8F745616680F337909D3A8E6C722CDF771* ___delegates;
};
struct MulticastDelegate_t_marshaled_pinvoke : public Delegate_t_marshaled_pinvoke
{
	Delegate_t_marshaled_pinvoke** ___delegates;
};
struct MulticastDelegate_t_marshaled_com : public Delegate_t_marshaled_com
{
	Delegate_t_marshaled_com** ___delegates;
};
struct SystemException_tCC48D868298F4C0705279823E34B00F4FBDB7295  : public Exception_t
{
};
struct TimestampProxy_t62B4D8B5017180CFD050625E52B3F07CB596BFC3  : public RuntimeObject
{
	HandleRef_t4B05E32B68797F702257D4E838B85A976313F08F ___swigCPtr;
	bool ___swigCMemOwn;
};
struct Type_t  : public MemberInfo_t
{
	RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B ____impl;
};
struct Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E  : public MulticastDelegate_t
{
};
struct ArgumentException_tAD90411542A20A9C72D5CDA3A84181D8B947A263  : public SystemException_tCC48D868298F4C0705279823E34B00F4FBDB7295
{
	String_t* ____paramName;
};
struct InvalidOperationException_t5DDE4D49B7405FAAB1E4576F4715A42A3FAD4BAB  : public SystemException_tCC48D868298F4C0705279823E34B00F4FBDB7295
{
};
struct NotSupportedException_t1429765983D409BD2986508963C98D214E4EBF4A  : public SystemException_tCC48D868298F4C0705279823E34B00F4FBDB7295
{
};
struct List_1_tBA97A62E49F18775E9FBE6AAE127D28F79FA87CB_StaticFields
{
	FieldValueProxyU5BU5D_tBF51F4AB40D42ED1E4C16E695B963A00ECCCE443* ___s_emptyArray;
};
struct List_1_t6959D78D53022948E65A4FDA6291D7F38FEFA02E_StaticFields
{
	__CanonU5BU5D_tFF96AE6C231BB36A6CEE54CEEB72ED8E90201979* ___s_emptyArray;
};
struct U3CPrivateImplementationDetailsU3E_tA33FA5CFD632B6289519017AA4220B8103FBB8CF_StaticFields
{
	__StaticArrayInitTypeSizeU3D10_t97EF624521201C9BBDCAFDE9C34BB090702C7D37 ___2A5E450F5962F3D7EDFAED00CD67B4C9588B4D79EAB01734B61CC4D791A45EB8;
};
struct CustomConverter_tE9655FBD1B8934E0CC2B34C1A3EDA5D26BD217EE_StaticFields
{
	MethodInfo_t* ____method;
};
struct DocumentReference_t771D97F07262D859FCE27B0C344AB1E54F6FFFCF_StaticFields
{
	ListenerRegistrationMap_1_t86C1C4A777AF595737DD7CE070E15B23120B62EF* ___snapshotListenerCallbacks;
	ListenerDelegate_tAE1235754123BEFDBA5A5392D62D732DEF5B32C6* ___documentSnapshotsHandler;
};
struct SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D_StaticFields
{
	SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___U3CDefaultU3Ek__BackingField;
};
struct String_t_StaticFields
{
	String_t* ___Empty;
};
struct U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904_StaticFields
{
	U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904* ___U3CU3E9;
	Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E* ___U3CU3E9__6_0;
};
struct U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_StaticFields
{
	U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01* ___U3CU3E9;
	Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E* ___U3CU3E9__1_0;
};
struct Boolean_t09A6377A54BE2F9E6985A8149F19234FD7DDFE22_StaticFields
{
	String_t* ___TrueString;
	String_t* ___FalseString;
};
struct DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D_StaticFields
{
	Int32U5BU5D_t19C97395396A72ECAF310612F0760F165060314C* ___s_daysToMonth365;
	Int32U5BU5D_t19C97395396A72ECAF310612F0760F165060314C* ___s_daysToMonth366;
	DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D ___MinValue;
	DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D ___MaxValue;
	DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D ___UnixEpoch;
};
struct IntPtr_t_StaticFields
{
	intptr_t ___Zero;
};
struct Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_StaticFields
{
	DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D ___s_unixEpoch;
};
struct DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4_StaticFields
{
	DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4 ___MinValue;
	DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4 ___MaxValue;
	DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4 ___UnixEpoch;
};
struct Type_t_StaticFields
{
	Binder_t91BFCE95A7057FADF4D8A1A342AFE52872246235* ___s_defaultBinder;
	Il2CppChar ___Delimiter;
	TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* ___EmptyTypes;
	RuntimeObject* ___Missing;
	MemberFilter_tF644F1AE82F611B677CE1964D5A3277DDA21D553* ___FilterAttribute;
	MemberFilter_tF644F1AE82F611B677CE1964D5A3277DDA21D553* ___FilterName;
	MemberFilter_tF644F1AE82F611B677CE1964D5A3277DDA21D553* ___FilterNameIgnoreCase;
};
#ifdef __clang__
#pragma clang diagnostic pop
#endif
struct TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB  : public RuntimeArray
{
	ALIGN_FIELD (8) Type_t* m_Items[1];

	inline Type_t* GetAt(il2cpp_array_size_t index) const
	{
		IL2CPP_ARRAY_BOUNDS_CHECK(index, (uint32_t)(this)->max_length);
		return m_Items[index];
	}
	inline Type_t** GetAddressAt(il2cpp_array_size_t index)
	{
		IL2CPP_ARRAY_BOUNDS_CHECK(index, (uint32_t)(this)->max_length);
		return m_Items + index;
	}
	inline void SetAt(il2cpp_array_size_t index, Type_t* value)
	{
		IL2CPP_ARRAY_BOUNDS_CHECK(index, (uint32_t)(this)->max_length);
		m_Items[index] = value;
		Il2CppCodeGenWriteBarrier((void**)m_Items + index, (void*)value);
	}
	inline Type_t* GetAtUnchecked(il2cpp_array_size_t index) const
	{
		return m_Items[index];
	}
	inline Type_t** GetAddressAtUnchecked(il2cpp_array_size_t index)
	{
		return m_Items + index;
	}
	inline void SetAtUnchecked(il2cpp_array_size_t index, Type_t* value)
	{
		m_Items[index] = value;
		Il2CppCodeGenWriteBarrier((void**)m_Items + index, (void*)value);
	}
};
struct ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918  : public RuntimeArray
{
	ALIGN_FIELD (8) RuntimeObject* m_Items[1];

	inline RuntimeObject* GetAt(il2cpp_array_size_t index) const
	{
		IL2CPP_ARRAY_BOUNDS_CHECK(index, (uint32_t)(this)->max_length);
		return m_Items[index];
	}
	inline RuntimeObject** GetAddressAt(il2cpp_array_size_t index)
	{
		IL2CPP_ARRAY_BOUNDS_CHECK(index, (uint32_t)(this)->max_length);
		return m_Items + index;
	}
	inline void SetAt(il2cpp_array_size_t index, RuntimeObject* value)
	{
		IL2CPP_ARRAY_BOUNDS_CHECK(index, (uint32_t)(this)->max_length);
		m_Items[index] = value;
		Il2CppCodeGenWriteBarrier((void**)m_Items + index, (void*)value);
	}
	inline RuntimeObject* GetAtUnchecked(il2cpp_array_size_t index) const
	{
		return m_Items[index];
	}
	inline RuntimeObject** GetAddressAtUnchecked(il2cpp_array_size_t index)
	{
		return m_Items + index;
	}
	inline void SetAtUnchecked(il2cpp_array_size_t index, RuntimeObject* value)
	{
		m_Items[index] = value;
		Il2CppCodeGenWriteBarrier((void**)m_Items + index, (void*)value);
	}
};
struct ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031  : public RuntimeArray
{
	ALIGN_FIELD (8) uint8_t m_Items[1];

	inline uint8_t GetAt(il2cpp_array_size_t index) const
	{
		IL2CPP_ARRAY_BOUNDS_CHECK(index, (uint32_t)(this)->max_length);
		return m_Items[index];
	}
	inline uint8_t* GetAddressAt(il2cpp_array_size_t index)
	{
		IL2CPP_ARRAY_BOUNDS_CHECK(index, (uint32_t)(this)->max_length);
		return m_Items + index;
	}
	inline void SetAt(il2cpp_array_size_t index, uint8_t value)
	{
		IL2CPP_ARRAY_BOUNDS_CHECK(index, (uint32_t)(this)->max_length);
		m_Items[index] = value;
	}
	inline uint8_t GetAtUnchecked(il2cpp_array_size_t index) const
	{
		return m_Items[index];
	}
	inline uint8_t* GetAddressAtUnchecked(il2cpp_array_size_t index)
	{
		return m_Items + index;
	}
	inline void SetAtUnchecked(il2cpp_array_size_t index, uint8_t value)
	{
		m_Items[index] = value;
	}
};
struct __CanonU5BU5D_tFF96AE6C231BB36A6CEE54CEEB72ED8E90201979  : public RuntimeArray
{
	ALIGN_FIELD (8) Il2CppSharedGenericObject* m_Items[1];

	inline Il2CppSharedGenericObject* GetAt(il2cpp_array_size_t index) const
	{
		IL2CPP_ARRAY_BOUNDS_CHECK(index, (uint32_t)(this)->max_length);
		return m_Items[index];
	}
	inline Il2CppSharedGenericObject** GetAddressAt(il2cpp_array_size_t index)
	{
		IL2CPP_ARRAY_BOUNDS_CHECK(index, (uint32_t)(this)->max_length);
		return m_Items + index;
	}
	inline void SetAt(il2cpp_array_size_t index, Il2CppSharedGenericObject* value)
	{
		IL2CPP_ARRAY_BOUNDS_CHECK(index, (uint32_t)(this)->max_length);
		m_Items[index] = value;
		Il2CppCodeGenWriteBarrier((void**)m_Items + index, (void*)value);
	}
	inline Il2CppSharedGenericObject* GetAtUnchecked(il2cpp_array_size_t index) const
	{
		return m_Items[index];
	}
	inline Il2CppSharedGenericObject** GetAddressAtUnchecked(il2cpp_array_size_t index)
	{
		return m_Items + index;
	}
	inline void SetAtUnchecked(il2cpp_array_size_t index, Il2CppSharedGenericObject* value)
	{
		m_Items[index] = value;
		Il2CppCodeGenWriteBarrier((void**)m_Items + index, (void*)value);
	}
};


IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void Func_2__ctor_m1826B059AE05490949E13D5D65BAEF9B786B8882_gshared (Func_2_t9411B5EEDC5B4099FE9226A3C6B92CA846F8991D* __this, RuntimeObject* ___0_object, intptr_t ___1_method, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR Il2CppSharedGenericObject* Enumerable_FirstOrDefault_TisIl2CppSharedGenericObject_m56F8705431D37A34AC14FDABF9C7D3E4045DB9EA_gshared (RuntimeObject* ___0_source, Func_2_t9411B5EEDC5B4099FE9226A3C6B92CA846F8991D* ___1_predicate, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void List_1__ctor_m7378BA5FBCA1E88080985FB810820B3F47DAD54C_gshared (List_1_t6959D78D53022948E65A4FDA6291D7F38FEFA02E* __this, const RuntimeMethod* method) ;
IL2CPP_MANAGED_FORCE_INLINE IL2CPP_METHOD_ATTR void List_1_Add_m0CE6E39234ED33F5195AABC8029D06D4756C75C1_gshared_inline (List_1_t6959D78D53022948E65A4FDA6291D7F38FEFA02E* __this, Il2CppSharedGenericObject* ___0_item, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void Dictionary_2__ctor_mE9A1CF09D5006AC41488691817533288065B42FF_gshared (Dictionary_2_tB3BF685342B8A1AB5995EE46B7014CBC0B281D5C* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_NO_INLINE IL2CPP_METHOD_ATTR void List_1_AddWithResize_mCC24A812DFC30C3DE2230E3C8EE705871C1DFF81_gshared (List_1_t6959D78D53022948E65A4FDA6291D7F38FEFA02E* __this, Il2CppSharedGenericObject* ___0_item, const RuntimeMethod* method) ;

IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void U3CU3Ec__ctor_mEF644C9FD3E7D28E8F691132D7173170CC503D2B (U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void Object__ctor_mE837C6B9FA8C6D5D109F4B2EC885D79919AC0EA2 (RuntimeObject* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR bool Type_op_Inequality_m83209C7BB3C05DFBEA3B6199B0BEFE8037301172 (Type_t* ___0_left, Type_t* ___1_right, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR Type_t* Nullable_GetUnderlyingType_mA8FA7F61D3B8E56EB4E40378020FD2854838BDF8 (Type_t* ___0_nullableType, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR Type_t* Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57 (RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B ___0_handle, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR String_t* String_Format_mFB7DA489BD99F4670881FF50EC017BFB0A5C0987 (String_t* ___0_format, RuntimeObject* ___1_arg0, RuntimeObject* ___2_arg1, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void InvalidOperationException__ctor_mE4CB6F4712AB6D99A2358FBAE2E052B3EE976162 (InvalidOperationException_t5DDE4D49B7405FAAB1E4576F4715A42A3FAD4BAB* __this, String_t* ___0_message, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* Activator_CreateInstance_mFF030428C64FDDFACC74DFAC97388A1C628BFBCF (Type_t* ___0_type, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* MethodBase_Invoke_mEEF3218648F111A8C338001A7804091A0747C826 (MethodBase_t* __this, RuntimeObject* ___0_obj, ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918* ___1_parameters, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR MethodInfo_t* Type_GetMethod_m9E66B5053F150537A74C490C1DA5174A7875189D (Type_t* __this, String_t* ___0_name, int32_t ___1_bindingAttr, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE (ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986* __this, Type_t* ___0_targetType, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR int32_t Type_GetTypeCode_m2CE476933AF4B381D7A52F4343B70E9878FDF466 (Type_t* ___0_type, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* EnumConverter_Int64ToEnumBaseType_mFFF3896402AAB924DF0BAA7F5321BE5460F6AA71 (EnumConverter_tC42B4916096ABFBC0334B1581071DED58F25FC98* __this, int64_t ___0_value, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* Enum_ToObject_mD898E0819FA640BC4E98924613B5DBD41146D1FF (Type_t* ___0_enumType, RuntimeObject* ___1_value, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR int64_t EnumConverter_EnumToInt64_m826E2ADBA4100B79A4CBB08363CC5F6F7D195FFE (EnumConverter_tC42B4916096ABFBC0334B1581071DED58F25FC98* __this, RuntimeObject* ___0_value, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* FieldValueProxy_Integer_m6AC6B4312C9F6FE596EB30CAC84F75F9BA2DF1E6 (int64_t ___0_value, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR String_t* String_Format_mA8DBB4C2516B9723C5A41E6CB1E2FAF4BBE96DD8 (String_t* ___0_format, RuntimeObject* ___1_arg0, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void EnumerableConverterBase__ctor_mED2B3485AD8ABC73CB9892B5BFA2A8526266783D (EnumerableConverterBase_tDF9B3A0A205608610843CF474E57F38B0154810C* __this, Type_t* ___0_targetType, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR bool Type_get_IsInterface_m484A7D9321E72758EABE7F36AE266EB0905957EC (Type_t* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR bool Type_op_Equality_m99930A0E44E420A685FABA60E60BA1CC5FA0EBDC (Type_t* ___0_left, Type_t* ___1_right, const RuntimeMethod* method) ;
inline void Func_2__ctor_mAFDFA2B152082BBF5E0626BF143EDACD61DE9D74 (Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E* __this, RuntimeObject* ___0_object, intptr_t ___1_method, const RuntimeMethod* method)
{
	((  void (*) (Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E*, RuntimeObject*, intptr_t, const RuntimeMethod*))Func_2__ctor_m1826B059AE05490949E13D5D65BAEF9B786B8882_gshared)(__this, ___0_object, ___1_method, method);
}
inline Type_t* Enumerable_FirstOrDefault_TisType_t_mB9171D7C79BDDA53104605F28E6DD2E02A864D61 (RuntimeObject* ___0_source, Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E* ___1_predicate, const RuntimeMethod* method)
{
	return ((  Type_t* (*) (RuntimeObject*, Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E*, const RuntimeMethod*))Enumerable_FirstOrDefault_TisIl2CppSharedGenericObject_m56F8705431D37A34AC14FDABF9C7D3E4045DB9EA_gshared)(___0_source, ___1_predicate, method);
}
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR int32_t FieldValueProxy_type_m0901CADDA170E659B1C761C5E260E52916B7DBCC (FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void Preconditions_CheckState_m2A3562A167E655645C6C53EE75B31DA3345C6112 (bool ___0_condition, String_t* ___1_message, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void NotSupportedException__ctor_mE174750CF0247BBB47544FFD71D66BB89630945B (NotSupportedException_t1429765983D409BD2986508963C98D214E4EBF4A* __this, String_t* ___0_message, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueVector_tC122E2EBD2D537A9B562AE821FBD088D90659ADE* FirestoreCpp_ConvertFieldValueToVector_m68155CF52D07773C4BBF33642320E8BEC05F354C (FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* ___0_value, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR uint32_t FieldValueVector_Size_m6025FB407D221BE61E57DB3A5AA2FE5C3CEB1E07 (FieldValueVector_tC122E2EBD2D537A9B562AE821FBD088D90659ADE* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void ArgumentException__ctor_m026938A67AF9D36BB7ED27F80425D7194B514465 (ArgumentException_tAD90411542A20A9C72D5CDA3A84181D8B947A263* __this, String_t* ___0_message, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* FieldValueVector_GetUnsafeView_m9967EF1F902FAA891F3E31F6D4643C343C279EDD (FieldValueVector_tC122E2EBD2D537A9B562AE821FBD088D90659ADE* __this, uint32_t ___0_i, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* ValueDeserializer_Deserialize_m27707281E147BAEB5786DC18DE5DA47065AEEE49 (DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* ___1_value, Type_t* ___2_targetType, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void U3CU3Ec__ctor_m97087E5D1803B984D47CAAC621D01C8810A2531B (U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01* __this, const RuntimeMethod* method) ;
inline void List_1__ctor_mA82BCBDC55CC01D88B9EE7A40D56AFD92FD5634E (List_1_tBA97A62E49F18775E9FBE6AAE127D28F79FA87CB* __this, const RuntimeMethod* method)
{
	((  void (*) (List_1_tBA97A62E49F18775E9FBE6AAE127D28F79FA87CB*, const RuntimeMethod*))List_1__ctor_m7378BA5FBCA1E88080985FB810820B3F47DAD54C_gshared)(__this, method);
}
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* ValueSerializer_Serialize_m2117726A27431810E2CA304A113870F7377C8035 (SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) ;
inline void List_1_Add_mA15F138468E54860B5D7176DDD482A6AD1AEEE48_inline (List_1_tBA97A62E49F18775E9FBE6AAE127D28F79FA87CB* __this, FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* ___0_item, const RuntimeMethod* method)
{
	((  void (*) (List_1_tBA97A62E49F18775E9FBE6AAE127D28F79FA87CB*, FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26*, const RuntimeMethod*))List_1_Add_m0CE6E39234ED33F5195AABC8029D06D4756C75C1_gshared_inline)(__this, ___0_item, method);
}
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* ConverterBase_ConvertToProxyArray_m6BDE19B39EA62551E8AA93ABF328995D8045D445 (RuntimeObject* ___0_list, const RuntimeMethod* method) ;
inline void Dictionary_2__ctor_mEFBE7A31B17F88B49904A09737C23C6D9489E210 (Dictionary_2_t7CC7577BE304ED34533E9BABC0EB2AA8A73D2BE8* __this, const RuntimeMethod* method)
{
	((  void (*) (Dictionary_2_t7CC7577BE304ED34533E9BABC0EB2AA8A73D2BE8*, const RuntimeMethod*))Dictionary_2__ctor_mE9A1CF09D5006AC41488691817533288065B42FF_gshared)(__this, method);
}
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* ConverterBase_ConvertToProxyMap_m765B9DDCD60793910D785A66FFE3B2D678A7A48D (RuntimeObject* ___0_map, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* FieldValueProxy_String_m45A5D4AF9B37E93E7AA12DF0984BC669729F228C (String_t* ___0_value, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void IntegerConverterBase__ctor_mA9476A3DF7B140631E1386724E61EA81FFE0893F (IntegerConverterBase_tFD031194A307F60CD0CAB0368F8169B87D3B1749* __this, Type_t* ___0_type, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* FieldValueProxy_Double_m76A3BCA369286127F50850D75F414C2317E2E1F5 (double ___0_value, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* FieldValueProxy_Boolean_mEF3E203D36D40EBB1F75F2C0F22D360946BB42ED (bool ___0_value, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR TimestampProxy_t62B4D8B5017180CFD050625E52B3F07CB596BFC3* Timestamp_ConvertToProxy_mFFE2890F49BC2F29631E02573F4EA3DA50DBEA96 (Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* FieldValueProxy_Timestamp_mAAD511133BE8E83375DFA072072CACCE16EE8DE9 (TimestampProxy_t62B4D8B5017180CFD050625E52B3F07CB596BFC3* ___0_value, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR GeoPointProxy_t01FBB939675E91CACA5D94712514DA430CD46968* GeoPoint_ConvertToProxy_mCDD545EB1CF5E75BB2C427B1DB0EA4BA9EC79A1B (GeoPoint_tACACE5A3D70BEDDF601A80CBCC66735A1D9A96E0* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* FieldValueProxy_GeoPoint_m2CC1F9750816A0272DD76676D37E3A985080D567 (GeoPointProxy_t01FBB939675E91CACA5D94712514DA430CD46968* ___0_value, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* ConverterBase_ConvertToProxyBlob_m31ECFB2070A2EDCCC43CDD41CBEB105E9579D160 (ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031* ___0_value, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031* Blob_ToBytes_mE56B7434FF107913B005531F2B3A93696288A360 (Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35 Blob_CopyFrom_mFB8663B1E622D584118854CD1FC3394FFF134496 (ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031* ___0_bytes, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3 Timestamp_FromDateTime_mA6D496874163B0A6323C5824B291BE8091782CB0 (DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D ___0_dateTime, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D Timestamp_ToDateTime_mDB1ACFC2FB995894CCED239A5E557CDA12F066FE (Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3 Timestamp_FromDateTimeOffset_m1E55B744FDA745628378811D18B81551BA8B674E (DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4 ___0_dateTimeOffset, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4 Timestamp_ToDateTimeOffset_mC1AB3B395A37909C8A0E01DB07C55C0E6AD3ED46 (Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR DocumentReferenceProxy_t2130D62C085B6D0F09E46550D38F9BD1EEBE0F7A* DocumentReference_get_Proxy_m6D6CA54A228000E504062E43C39C05FA7ACC1485 (DocumentReference_t771D97F07262D859FCE27B0C344AB1E54F6FFFCF* __this, const RuntimeMethod* method) ;
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* FieldValueProxy_Reference_mB824AA209F6327C73E4FD5752E9215AE82063743 (DocumentReferenceProxy_t2130D62C085B6D0F09E46550D38F9BD1EEBE0F7A* ___0_value, const RuntimeMethod* method) ;
inline void List_1_AddWithResize_mCC24A812DFC30C3DE2230E3C8EE705871C1DFF81 (List_1_t6959D78D53022948E65A4FDA6291D7F38FEFA02E* __this, Il2CppSharedGenericObject* ___0_item, const RuntimeMethod* method)
{
	((  void (*) (List_1_t6959D78D53022948E65A4FDA6291D7F38FEFA02E*, Il2CppSharedGenericObject*, const RuntimeMethod*))List_1_AddWithResize_mCC24A812DFC30C3DE2230E3C8EE705871C1DFF81_gshared)(__this, ___0_item, method);
}
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71413
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void U3CU3Ec__cctor_m8089332BAED095BB30419F0DCBBDB3F8B60BBD84 (const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904* L_0 = (U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904*)il2cpp_codegen_object_new(U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904_il2cpp_TypeInfo_var);
		U3CU3Ec__ctor_mEF644C9FD3E7D28E8F691132D7173170CC503D2B(L_0, NULL);
		((U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904_StaticFields*)il2cpp_codegen_static_fields_for(U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904_il2cpp_TypeInfo_var))->___U3CU3E9 = L_0;
		Il2CppCodeGenWriteBarrier((void**)(&((U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904_StaticFields*)il2cpp_codegen_static_fields_for(U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904_il2cpp_TypeInfo_var))->___U3CU3E9), (void*)L_0);
		return;
	}
}
// Method Definition Index: 71414
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void U3CU3Ec__ctor_mEF644C9FD3E7D28E8F691132D7173170CC503D2B (U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		Object__ctor_mE837C6B9FA8C6D5D109F4B2EC885D79919AC0EA2(__this, NULL);
		return;
	}
}
// Method Definition Index: 71415
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR bool U3CU3Ec_U3CTryGetStringDictionaryValueTypeU3Eb__6_0_m5A15F1C5B946E007B2B8C8A185608DCD25035A4F (U3CU3Ec_t5391688E5E57A498746D836E52B61058EDEC7904* __this, Type_t* ___0_t, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		Type_t* L_0 = ___0_t;
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		bool L_1;
		L_1 = Type_op_Inequality_m83209C7BB3C05DFBEA3B6199B0BEFE8037301172(L_0, (Type_t*)NULL, NULL);
		return L_1;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71416
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* CustomConverter_ForConverterType_mD9C37418754C136186C19D64AA64D69085934C50 (Type_t* ___0_converterType, Type_t* ___1_targetType, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&CustomConverter_tE9655FBD1B8934E0CC2B34C1A3EDA5D26BD217EE_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&FirestoreConverter_1_tC3DD0AD7A71139C5374F3250C18E115370EB4FEA_0_0_0_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&IFirestoreInternalConverter_tA4A86E49EE5CD2A63DF6F549484A126080771A44_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	Type_t* V_0 = NULL;
	Type_t* V_1 = NULL;
	RuntimeObject* V_2 = NULL;
	bool V_3 = false;
	RuntimeObject* V_4 = NULL;
	Type_t* G_B2_0 = NULL;
	Type_t* G_B1_0 = NULL;
	{
		Type_t* L_0 = ___1_targetType;
		Type_t* L_1;
		L_1 = Nullable_GetUnderlyingType_mA8FA7F61D3B8E56EB4E40378020FD2854838BDF8(L_0, NULL);
		Type_t* L_2 = L_1;
		if (L_2)
		{
			G_B2_0 = L_2;
			goto IL_000c;
		}
		G_B1_0 = L_2;
	}
	{
		Type_t* L_3 = ___1_targetType;
		G_B2_0 = L_3;
	}

IL_000c:
	{
		V_0 = G_B2_0;
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_4 = { reinterpret_cast<intptr_t> (FirestoreConverter_1_tC3DD0AD7A71139C5374F3250C18E115370EB4FEA_0_0_0_var) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_5;
		L_5 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_4, NULL);
		TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* L_6 = (TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB*)(TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB*)SZArrayNew(TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB_il2cpp_TypeInfo_var, (uint32_t)1);
		TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* L_7 = L_6;
		Type_t* L_8 = V_0;
		NullCheck(L_7);
		ArrayElementTypeCheck (L_7, L_8);
		(L_7)->SetAt(static_cast<il2cpp_array_size_t>(0), (Type_t*)L_8);
		NullCheck(L_5);
		Type_t* L_9;
		L_9 = VirtualFuncInvoker1< Type_t*, TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* >::Invoke(121, L_5, L_7);
		V_1 = L_9;
		Type_t* L_10 = ___0_converterType;
		Type_t* L_11 = V_1;
		NullCheck(L_10);
		bool L_12;
		L_12 = VirtualFuncInvoker1< bool, Type_t* >::Invoke(20, L_10, L_11);
		V_3 = (bool)((((int32_t)L_12) == ((int32_t)0))? 1 : 0);
		bool L_13 = V_3;
		if (!L_13)
		{
			goto IL_0048;
		}
	}
	{
		Type_t* L_14 = ___0_converterType;
		Type_t* L_15 = V_0;
		String_t* L_16;
		L_16 = String_Format_mFB7DA489BD99F4670881FF50EC017BFB0A5C0987(((String_t*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&_stringLiteral43BCC5CF1748E4B040E97BC78BC339A37FC37CB6)), L_14, L_15, NULL);
		InvalidOperationException_t5DDE4D49B7405FAAB1E4576F4715A42A3FAD4BAB* L_17 = (InvalidOperationException_t5DDE4D49B7405FAAB1E4576F4715A42A3FAD4BAB*)il2cpp_codegen_object_new(((RuntimeClass*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&InvalidOperationException_t5DDE4D49B7405FAAB1E4576F4715A42A3FAD4BAB_il2cpp_TypeInfo_var)));
		InvalidOperationException__ctor_mE4CB6F4712AB6D99A2358FBAE2E052B3EE976162(L_17, L_16, NULL);
		IL2CPP_RAISE_MANAGED_EXCEPTION(L_17, ((RuntimeMethod*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&CustomConverter_ForConverterType_mD9C37418754C136186C19D64AA64D69085934C50_RuntimeMethod_var)));
	}

IL_0048:
	{
		Type_t* L_18 = ___0_converterType;
		RuntimeObject* L_19;
		L_19 = Activator_CreateInstance_mFF030428C64FDDFACC74DFAC97388A1C628BFBCF(L_18, NULL);
		V_2 = L_19;
		il2cpp_codegen_runtime_class_init_inline(CustomConverter_tE9655FBD1B8934E0CC2B34C1A3EDA5D26BD217EE_il2cpp_TypeInfo_var);
		MethodInfo_t* L_20 = ((CustomConverter_tE9655FBD1B8934E0CC2B34C1A3EDA5D26BD217EE_StaticFields*)il2cpp_codegen_static_fields_for(CustomConverter_tE9655FBD1B8934E0CC2B34C1A3EDA5D26BD217EE_il2cpp_TypeInfo_var))->____method;
		TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* L_21 = (TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB*)(TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB*)SZArrayNew(TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB_il2cpp_TypeInfo_var, (uint32_t)1);
		TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* L_22 = L_21;
		Type_t* L_23 = V_0;
		NullCheck(L_22);
		ArrayElementTypeCheck (L_22, L_23);
		(L_22)->SetAt(static_cast<il2cpp_array_size_t>(0), (Type_t*)L_23);
		NullCheck(L_20);
		MethodInfo_t* L_24;
		L_24 = VirtualFuncInvoker1< MethodInfo_t*, TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* >::Invoke(40, L_20, L_22);
		ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918* L_25 = (ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918*)(ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918*)SZArrayNew(ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918_il2cpp_TypeInfo_var, (uint32_t)1);
		ObjectU5BU5D_t8061030B0A12A55D5AD8652A20C922FE99450918* L_26 = L_25;
		RuntimeObject* L_27 = V_2;
		NullCheck(L_26);
		ArrayElementTypeCheck (L_26, L_27);
		(L_26)->SetAt(static_cast<il2cpp_array_size_t>(0), (RuntimeObject*)L_27);
		NullCheck(L_24);
		RuntimeObject* L_28;
		L_28 = MethodBase_Invoke_mEEF3218648F111A8C338001A7804091A0747C826(L_24, NULL, L_26, NULL);
		V_4 = ((RuntimeObject*)Castclass((RuntimeObject*)L_28, IFirestoreInternalConverter_tA4A86E49EE5CD2A63DF6F549484A126080771A44_il2cpp_TypeInfo_var));
		goto IL_007c;
	}

IL_007c:
	{
		RuntimeObject* L_29 = V_4;
		return L_29;
	}
}
// Method Definition Index: 71418
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void CustomConverter__cctor_m754160AD42D51DA112EE90735BC77996610A3CDE (const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&CustomConverter_tE9655FBD1B8934E0CC2B34C1A3EDA5D26BD217EE_0_0_0_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&CustomConverter_tE9655FBD1B8934E0CC2B34C1A3EDA5D26BD217EE_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&_stringLiteral7268D3EF93898CD5B17AD842F414170F892D2E42);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (CustomConverter_tE9655FBD1B8934E0CC2B34C1A3EDA5D26BD217EE_0_0_0_var) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		NullCheck(L_1);
		MethodInfo_t* L_2;
		L_2 = Type_GetMethod_m9E66B5053F150537A74C490C1DA5174A7875189D(L_1, _stringLiteral7268D3EF93898CD5B17AD842F414170F892D2E42, ((int32_t)40), NULL);
		((CustomConverter_tE9655FBD1B8934E0CC2B34C1A3EDA5D26BD217EE_StaticFields*)il2cpp_codegen_static_fields_for(CustomConverter_tE9655FBD1B8934E0CC2B34C1A3EDA5D26BD217EE_il2cpp_TypeInfo_var))->____method = L_2;
		Il2CppCodeGenWriteBarrier((void**)(&((CustomConverter_tE9655FBD1B8934E0CC2B34C1A3EDA5D26BD217EE_StaticFields*)il2cpp_codegen_static_fields_for(CustomConverter_tE9655FBD1B8934E0CC2B34C1A3EDA5D26BD217EE_il2cpp_TypeInfo_var))->____method), (void*)L_2);
		return;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71427
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void EnumConverter__ctor_m48BD9A0C8F8B1F089A5CBC986C4292FDF19746F4 (EnumConverter_tC42B4916096ABFBC0334B1581071DED58F25FC98* __this, Type_t* ___0_targetType, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		Type_t* L_0 = ___0_targetType;
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_0, NULL);
		Type_t* L_1 = ((ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986*)__this)->___TargetType;
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		int32_t L_2;
		L_2 = Type_GetTypeCode_m2CE476933AF4B381D7A52F4343B70E9878FDF466(L_1, NULL);
		__this->____typeCode = L_2;
		return;
	}
}
// Method Definition Index: 71428
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* EnumConverter_DeserializeInteger_mD03C70F39CD403E43283A455D29801AA2E165CCD (EnumConverter_tC42B4916096ABFBC0334B1581071DED58F25FC98* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, int64_t ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	RuntimeObject* V_0 = NULL;
	RuntimeObject* V_1 = NULL;
	{
		int64_t L_0 = ___1_value;
		RuntimeObject* L_1;
		L_1 = EnumConverter_Int64ToEnumBaseType_mFFF3896402AAB924DF0BAA7F5321BE5460F6AA71(__this, L_0, NULL);
		V_0 = L_1;
		Type_t* L_2 = ((ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986*)__this)->___TargetType;
		RuntimeObject* L_3 = V_0;
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.enum_class);
		RuntimeObject* L_4;
		L_4 = Enum_ToObject_mD898E0819FA640BC4E98924613B5DBD41146D1FF(L_2, L_3, NULL);
		V_1 = L_4;
		goto IL_0018;
	}

IL_0018:
	{
		RuntimeObject* L_5 = V_1;
		return L_5;
	}
}
// Method Definition Index: 71429
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* EnumConverter_Serialize_mC314E3457C035E500066692723AE0A8D5C4D76FB (EnumConverter_tC42B4916096ABFBC0334B1581071DED58F25FC98* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		int64_t L_1;
		L_1 = EnumConverter_EnumToInt64_m826E2ADBA4100B79A4CBB08363CC5F6F7D195FFE(__this, L_0, NULL);
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_2;
		L_2 = FieldValueProxy_Integer_m6AC6B4312C9F6FE596EB30CAC84F75F9BA2DF1E6(L_1, NULL);
		return L_2;
	}
}
// Method Definition Index: 71430
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR int64_t EnumConverter_EnumToInt64_m826E2ADBA4100B79A4CBB08363CC5F6F7D195FFE (EnumConverter_tC42B4916096ABFBC0334B1581071DED58F25FC98* __this, RuntimeObject* ___0_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&EnumConverter_EnumToInt64_m826E2ADBA4100B79A4CBB08363CC5F6F7D195FFE_RuntimeMethod_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	int32_t V_0 = 0;
	int32_t V_1 = 0;
	int64_t V_2 = 0;
	{
		int32_t L_0 = __this->____typeCode;
		V_1 = L_0;
		int32_t L_1 = V_1;
		V_0 = L_1;
		int32_t L_2 = V_0;
		switch (((int32_t)il2cpp_codegen_subtract((int32_t)L_2, 5)))
		{
			case 0:
			{
				goto IL_003e;
			}
			case 1:
			{
				goto IL_0034;
			}
			case 2:
			{
				goto IL_0048;
			}
			case 3:
			{
				goto IL_0052;
			}
			case 4:
			{
				goto IL_005c;
			}
			case 5:
			{
				goto IL_0066;
			}
			case 6:
			{
				goto IL_0070;
			}
			case 7:
			{
				goto IL_0079;
			}
		}
	}
	{
		goto IL_0083;
	}

IL_0034:
	{
		RuntimeObject* L_3 = ___0_value;
		uint64_t L_4 = (il2cpp_codegen_conv<uint64_t,uint8_t,int32_t,false,false>(((*(uint8_t*)UnBox(L_3, il2cpp_defaults.byte_class))),NULL));
		V_2 = (int64_t)L_4;
		goto IL_009e;
	}

IL_003e:
	{
		RuntimeObject* L_5 = ___0_value;
		int64_t L_6 = (il2cpp_codegen_conv<int64_t,int8_t,int32_t,false,false>(((*(int8_t*)UnBox(L_5, il2cpp_defaults.sbyte_class))),NULL));
		V_2 = L_6;
		goto IL_009e;
	}

IL_0048:
	{
		RuntimeObject* L_7 = ___0_value;
		int64_t L_8 = (il2cpp_codegen_conv<int64_t,int16_t,int32_t,false,false>(((*(int16_t*)UnBox(L_7, il2cpp_defaults.int16_class))),NULL));
		V_2 = L_8;
		goto IL_009e;
	}

IL_0052:
	{
		RuntimeObject* L_9 = ___0_value;
		uint64_t L_10 = (il2cpp_codegen_conv<uint64_t,uint16_t,int32_t,false,false>(((*(uint16_t*)UnBox(L_9, il2cpp_defaults.uint16_class))),NULL));
		V_2 = (int64_t)L_10;
		goto IL_009e;
	}

IL_005c:
	{
		RuntimeObject* L_11 = ___0_value;
		int64_t L_12 = (il2cpp_codegen_conv<int64_t,int32_t,int32_t,false,false>(((*(int32_t*)UnBox(L_11, il2cpp_defaults.int32_class))),NULL));
		V_2 = L_12;
		goto IL_009e;
	}

IL_0066:
	{
		RuntimeObject* L_13 = ___0_value;
		uint64_t L_14 = (il2cpp_codegen_conv<uint64_t,uint32_t,int32_t,false,false>(((*(uint32_t*)UnBox(L_13, il2cpp_defaults.uint32_class))),NULL));
		V_2 = (int64_t)L_14;
		goto IL_009e;
	}

IL_0070:
	{
		RuntimeObject* L_15 = ___0_value;
		V_2 = ((*(int64_t*)UnBox(L_15, il2cpp_defaults.int64_class)));
		goto IL_009e;
	}

IL_0079:
	{
		RuntimeObject* L_16 = ___0_value;
		int64_t L_17 = (il2cpp_codegen_conv<int64_t,uint64_t,int64_t,true,true>(((*(uint64_t*)UnBox(L_16, il2cpp_defaults.uint64_class))),EnumConverter_EnumToInt64_m826E2ADBA4100B79A4CBB08363CC5F6F7D195FFE_RuntimeMethod_var));
		V_2 = L_17;
		goto IL_009e;
	}

IL_0083:
	{
		int32_t L_18 = __this->____typeCode;
		int32_t L_19 = L_18;
		RuntimeObject* L_20 = Box(((RuntimeClass*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&TypeCode_tBEF9BE86C8BCF5A6B82F3381219738D27804EF79_il2cpp_TypeInfo_var)), &L_19);
		String_t* L_21;
		L_21 = String_Format_mA8DBB4C2516B9723C5A41E6CB1E2FAF4BBE96DD8(((String_t*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&_stringLiteralD05A5FA4C66534B6FE80FA93AE969DA32BB265D8)), L_20, NULL);
		InvalidOperationException_t5DDE4D49B7405FAAB1E4576F4715A42A3FAD4BAB* L_22 = (InvalidOperationException_t5DDE4D49B7405FAAB1E4576F4715A42A3FAD4BAB*)il2cpp_codegen_object_new(((RuntimeClass*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&InvalidOperationException_t5DDE4D49B7405FAAB1E4576F4715A42A3FAD4BAB_il2cpp_TypeInfo_var)));
		InvalidOperationException__ctor_mE4CB6F4712AB6D99A2358FBAE2E052B3EE976162(L_22, L_21, NULL);
		IL2CPP_RAISE_MANAGED_EXCEPTION(L_22, ((RuntimeMethod*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&EnumConverter_EnumToInt64_m826E2ADBA4100B79A4CBB08363CC5F6F7D195FFE_RuntimeMethod_var)));
	}

IL_009e:
	{
		int64_t L_23 = V_2;
		return L_23;
	}
}
// Method Definition Index: 71431
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* EnumConverter_Int64ToEnumBaseType_mFFF3896402AAB924DF0BAA7F5321BE5460F6AA71 (EnumConverter_tC42B4916096ABFBC0334B1581071DED58F25FC98* __this, int64_t ___0_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&EnumConverter_Int64ToEnumBaseType_mFFF3896402AAB924DF0BAA7F5321BE5460F6AA71_RuntimeMethod_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	int32_t V_0 = 0;
	int32_t V_1 = 0;
	RuntimeObject* V_2 = NULL;
	{
		int32_t L_0 = __this->____typeCode;
		V_1 = L_0;
		int32_t L_1 = V_1;
		V_0 = L_1;
		int32_t L_2 = V_0;
		switch (((int32_t)il2cpp_codegen_subtract((int32_t)L_2, 5)))
		{
			case 0:
			{
				goto IL_003e;
			}
			case 1:
			{
				goto IL_0034;
			}
			case 2:
			{
				goto IL_0048;
			}
			case 3:
			{
				goto IL_0052;
			}
			case 4:
			{
				goto IL_005c;
			}
			case 5:
			{
				goto IL_0066;
			}
			case 6:
			{
				goto IL_0070;
			}
			case 7:
			{
				goto IL_0079;
			}
		}
	}
	{
		goto IL_0083;
	}

IL_0034:
	{
		int64_t L_3 = ___0_value;
		uint8_t L_4 = (il2cpp_codegen_conv<uint8_t,int64_t,int64_t,true,false>(L_3,EnumConverter_Int64ToEnumBaseType_mFFF3896402AAB924DF0BAA7F5321BE5460F6AA71_RuntimeMethod_var));
		uint8_t L_5 = L_4;
		RuntimeObject* L_6 = Box(il2cpp_defaults.byte_class, &L_5);
		V_2 = L_6;
		goto IL_009e;
	}

IL_003e:
	{
		int64_t L_7 = ___0_value;
		int8_t L_8 = (il2cpp_codegen_conv<int8_t,int64_t,int64_t,true,false>(L_7,EnumConverter_Int64ToEnumBaseType_mFFF3896402AAB924DF0BAA7F5321BE5460F6AA71_RuntimeMethod_var));
		int8_t L_9 = L_8;
		RuntimeObject* L_10 = Box(il2cpp_defaults.sbyte_class, &L_9);
		V_2 = L_10;
		goto IL_009e;
	}

IL_0048:
	{
		int64_t L_11 = ___0_value;
		int16_t L_12 = (il2cpp_codegen_conv<int16_t,int64_t,int64_t,true,false>(L_11,EnumConverter_Int64ToEnumBaseType_mFFF3896402AAB924DF0BAA7F5321BE5460F6AA71_RuntimeMethod_var));
		int16_t L_13 = L_12;
		RuntimeObject* L_14 = Box(il2cpp_defaults.int16_class, &L_13);
		V_2 = L_14;
		goto IL_009e;
	}

IL_0052:
	{
		int64_t L_15 = ___0_value;
		uint16_t L_16 = (il2cpp_codegen_conv<uint16_t,int64_t,int64_t,true,false>(L_15,EnumConverter_Int64ToEnumBaseType_mFFF3896402AAB924DF0BAA7F5321BE5460F6AA71_RuntimeMethod_var));
		uint16_t L_17 = L_16;
		RuntimeObject* L_18 = Box(il2cpp_defaults.uint16_class, &L_17);
		V_2 = L_18;
		goto IL_009e;
	}

IL_005c:
	{
		int64_t L_19 = ___0_value;
		int32_t L_20 = (il2cpp_codegen_conv<int32_t,int64_t,int64_t,true,false>(L_19,EnumConverter_Int64ToEnumBaseType_mFFF3896402AAB924DF0BAA7F5321BE5460F6AA71_RuntimeMethod_var));
		int32_t L_21 = L_20;
		RuntimeObject* L_22 = Box(il2cpp_defaults.int32_class, &L_21);
		V_2 = L_22;
		goto IL_009e;
	}

IL_0066:
	{
		int64_t L_23 = ___0_value;
		uint32_t L_24 = (il2cpp_codegen_conv<uint32_t,int64_t,int64_t,true,false>(L_23,EnumConverter_Int64ToEnumBaseType_mFFF3896402AAB924DF0BAA7F5321BE5460F6AA71_RuntimeMethod_var));
		uint32_t L_25 = L_24;
		RuntimeObject* L_26 = Box(il2cpp_defaults.uint32_class, &L_25);
		V_2 = L_26;
		goto IL_009e;
	}

IL_0070:
	{
		int64_t L_27 = ___0_value;
		int64_t L_28 = L_27;
		RuntimeObject* L_29 = Box(il2cpp_defaults.int64_class, &L_28);
		V_2 = L_29;
		goto IL_009e;
	}

IL_0079:
	{
		int64_t L_30 = ___0_value;
		uint64_t L_31 = (il2cpp_codegen_conv<uint64_t,int64_t,int64_t,true,false>(L_30,EnumConverter_Int64ToEnumBaseType_mFFF3896402AAB924DF0BAA7F5321BE5460F6AA71_RuntimeMethod_var));
		uint64_t L_32 = L_31;
		RuntimeObject* L_33 = Box(il2cpp_defaults.uint64_class, &L_32);
		V_2 = L_33;
		goto IL_009e;
	}

IL_0083:
	{
		int32_t L_34 = __this->____typeCode;
		int32_t L_35 = L_34;
		RuntimeObject* L_36 = Box(((RuntimeClass*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&TypeCode_tBEF9BE86C8BCF5A6B82F3381219738D27804EF79_il2cpp_TypeInfo_var)), &L_35);
		String_t* L_37;
		L_37 = String_Format_mA8DBB4C2516B9723C5A41E6CB1E2FAF4BBE96DD8(((String_t*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&_stringLiteralD05A5FA4C66534B6FE80FA93AE969DA32BB265D8)), L_36, NULL);
		InvalidOperationException_t5DDE4D49B7405FAAB1E4576F4715A42A3FAD4BAB* L_38 = (InvalidOperationException_t5DDE4D49B7405FAAB1E4576F4715A42A3FAD4BAB*)il2cpp_codegen_object_new(((RuntimeClass*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&InvalidOperationException_t5DDE4D49B7405FAAB1E4576F4715A42A3FAD4BAB_il2cpp_TypeInfo_var)));
		InvalidOperationException__ctor_mE4CB6F4712AB6D99A2358FBAE2E052B3EE976162(L_38, L_37, NULL);
		IL2CPP_RAISE_MANAGED_EXCEPTION(L_38, ((RuntimeMethod*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&EnumConverter_Int64ToEnumBaseType_mFFF3896402AAB924DF0BAA7F5321BE5460F6AA71_RuntimeMethod_var)));
	}

IL_009e:
	{
		RuntimeObject* L_39 = V_2;
		return L_39;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71432
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void EnumerableConverter__ctor_mD759176C08F3C8F9FA3D7BA76E33A13F7AF930A5 (EnumerableConverter_t3417703BE9D939EBD479C55B1E2AA576F807633F* __this, Type_t* ___0_targetType, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Enumerable_FirstOrDefault_TisType_t_mB9171D7C79BDDA53104605F28E6DD2E02A864D61_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&IEnumerable_1_t6D39F4BC58A66D98BCEB112169CFDE48809FC555_0_0_0_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&U3CU3Ec_U3C_ctorU3Eb__1_0_mC65EA465ADE3F30333D7A4AD80443952B0BAAF40_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* V_0 = NULL;
	Type_t* V_1 = NULL;
	bool V_2 = false;
	bool V_3 = false;
	int32_t G_B4_0 = 0;
	Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E* G_B8_0 = NULL;
	TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* G_B8_1 = NULL;
	Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E* G_B7_0 = NULL;
	TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* G_B7_1 = NULL;
	{
		Type_t* L_0 = ___0_targetType;
		EnumerableConverterBase__ctor_mED2B3485AD8ABC73CB9892B5BFA2A8526266783D(__this, L_0, NULL);
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_1 = { reinterpret_cast<intptr_t> (&il2cpp_defaults.object_class->byval_arg) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_2;
		L_2 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_1, NULL);
		__this->____elementType = L_2;
		Il2CppCodeGenWriteBarrier((void**)(&__this->____elementType), (void*)L_2);
		Type_t* L_3 = ___0_targetType;
		NullCheck(L_3);
		TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* L_4;
		L_4 = VirtualFuncInvoker0< TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* >::Invoke(113, L_3);
		V_0 = L_4;
		V_1 = (Type_t*)NULL;
		Type_t* L_5 = ___0_targetType;
		NullCheck(L_5);
		bool L_6;
		L_6 = Type_get_IsInterface_m484A7D9321E72758EABE7F36AE266EB0905957EC(L_5, NULL);
		if (!L_6)
		{
			goto IL_0049;
		}
	}
	{
		Type_t* L_7 = ___0_targetType;
		NullCheck(L_7);
		bool L_8;
		L_8 = VirtualFuncInvoker0< bool >::Invoke(39, L_7);
		if (!L_8)
		{
			goto IL_0049;
		}
	}
	{
		Type_t* L_9 = ___0_targetType;
		NullCheck(L_9);
		Type_t* L_10;
		L_10 = VirtualFuncInvoker0< Type_t* >::Invoke(47, L_9);
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_11 = { reinterpret_cast<intptr_t> (IEnumerable_1_t6D39F4BC58A66D98BCEB112169CFDE48809FC555_0_0_0_var) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_12;
		L_12 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_11, NULL);
		bool L_13;
		L_13 = Type_op_Equality_m99930A0E44E420A685FABA60E60BA1CC5FA0EBDC(L_10, L_12, NULL);
		G_B4_0 = ((int32_t)(L_13));
		goto IL_004a;
	}

IL_0049:
	{
		G_B4_0 = 0;
	}

IL_004a:
	{
		V_2 = (bool)G_B4_0;
		bool L_14 = V_2;
		if (!L_14)
		{
			goto IL_0054;
		}
	}
	{
		Type_t* L_15 = ___0_targetType;
		V_1 = L_15;
		goto IL_007c;
	}

IL_0054:
	{
		TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* L_16 = V_0;
		il2cpp_codegen_runtime_class_init_inline(U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_il2cpp_TypeInfo_var);
		Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E* L_17 = ((U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_StaticFields*)il2cpp_codegen_static_fields_for(U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_il2cpp_TypeInfo_var))->___U3CU3E9__1_0;
		Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E* L_18 = L_17;
		if (L_18)
		{
			G_B8_0 = L_18;
			G_B8_1 = L_16;
			goto IL_0075;
		}
		G_B7_0 = L_18;
		G_B7_1 = L_16;
	}
	{
		il2cpp_codegen_runtime_class_init_inline(U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_il2cpp_TypeInfo_var);
		U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01* L_19 = ((U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_StaticFields*)il2cpp_codegen_static_fields_for(U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_il2cpp_TypeInfo_var))->___U3CU3E9;
		Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E* L_20 = (Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E*)il2cpp_codegen_object_new(Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E_il2cpp_TypeInfo_var);
		Func_2__ctor_mAFDFA2B152082BBF5E0626BF143EDACD61DE9D74(L_20, L_19, (intptr_t)((void*)U3CU3Ec_U3C_ctorU3Eb__1_0_mC65EA465ADE3F30333D7A4AD80443952B0BAAF40_RuntimeMethod_var), NULL);
		Func_2_t7AF8146EC94DFCBB0F1B3E70111C1FB21D39F00E* L_21 = L_20;
		((U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_StaticFields*)il2cpp_codegen_static_fields_for(U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_il2cpp_TypeInfo_var))->___U3CU3E9__1_0 = L_21;
		Il2CppCodeGenWriteBarrier((void**)(&((U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_StaticFields*)il2cpp_codegen_static_fields_for(U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_il2cpp_TypeInfo_var))->___U3CU3E9__1_0), (void*)L_21);
		G_B8_0 = L_21;
		G_B8_1 = G_B7_1;
	}

IL_0075:
	{
		Type_t* L_22;
		L_22 = Enumerable_FirstOrDefault_TisType_t_mB9171D7C79BDDA53104605F28E6DD2E02A864D61((RuntimeObject*)G_B8_1, G_B8_0, Enumerable_FirstOrDefault_TisType_t_mB9171D7C79BDDA53104605F28E6DD2E02A864D61_RuntimeMethod_var);
		V_1 = L_22;
	}

IL_007c:
	{
		Type_t* L_23 = V_1;
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		bool L_24;
		L_24 = Type_op_Inequality_m83209C7BB3C05DFBEA3B6199B0BEFE8037301172(L_23, (Type_t*)NULL, NULL);
		V_3 = L_24;
		bool L_25 = V_3;
		if (!L_25)
		{
			goto IL_0097;
		}
	}
	{
		Type_t* L_26 = V_1;
		NullCheck(L_26);
		TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* L_27;
		L_27 = VirtualFuncInvoker0< TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* >::Invoke(49, L_26);
		NullCheck(L_27);
		int32_t L_28 = 0;
		Type_t* L_29 = (L_27)->GetAt(static_cast<il2cpp_array_size_t>(L_28));
		__this->____elementType = L_29;
		Il2CppCodeGenWriteBarrier((void**)(&__this->____elementType), (void*)L_29);
	}

IL_0097:
	{
		return;
	}
}
// Method Definition Index: 71433
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* EnumerableConverter_DeserializeArray_m3FE8044084F9036E98E38F94C8BE5770B9AB8EF9 (EnumerableConverter_t3417703BE9D939EBD479C55B1E2AA576F807633F* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* ___1_arrayValue, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&FirestoreCpp_t1169FEBB415417F3CA93CB88454A962A09744644_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&IDisposable_t030E0496B4E0E4E4F086825007979AF51F7248C5_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&IList_t1C522956D79B7DC92B5B01053DF1AC058C8B598D_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&List_1_tA989C33995B015444AE843B573C94F683039E41F_0_0_0_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&_stringLiteral8F18A0B99520AFAE0A3B688FCBD668AF2225DB6D);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	Type_t* V_0 = NULL;
	bool V_1 = false;
	FieldValueVector_tC122E2EBD2D537A9B562AE821FBD088D90659ADE* V_2 = NULL;
	uint32_t V_3 = 0;
	RuntimeObject* V_4 = NULL;
	bool V_5 = false;
	int32_t V_6 = 0;
	FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* V_7 = NULL;
	RuntimeObject* V_8 = NULL;
	bool V_9 = false;
	RuntimeObject* V_10 = NULL;
	{
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_0 = ___1_arrayValue;
		NullCheck(L_0);
		int32_t L_1;
		L_1 = FieldValueProxy_type_m0901CADDA170E659B1C761C5E260E52916B7DBCC(L_0, NULL);
		Preconditions_CheckState_m2A3562A167E655645C6C53EE75B31DA3345C6112((bool)((((int32_t)L_1) == ((int32_t)((int32_t)9)))? 1 : 0), _stringLiteral8F18A0B99520AFAE0A3B688FCBD668AF2225DB6D, NULL);
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_2 = { reinterpret_cast<intptr_t> (List_1_tA989C33995B015444AE843B573C94F683039E41F_0_0_0_var) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_3;
		L_3 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_2, NULL);
		TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* L_4 = (TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB*)(TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB*)SZArrayNew(TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB_il2cpp_TypeInfo_var, (uint32_t)1);
		TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* L_5 = L_4;
		Type_t* L_6 = __this->____elementType;
		NullCheck(L_5);
		ArrayElementTypeCheck (L_5, L_6);
		(L_5)->SetAt(static_cast<il2cpp_array_size_t>(0), (Type_t*)L_6);
		NullCheck(L_3);
		Type_t* L_7;
		L_7 = VirtualFuncInvoker1< Type_t*, TypeU5BU5D_t97234E1129B564EB38B8D85CAC2AD8B5B9522FFB* >::Invoke(121, L_3, L_5);
		V_0 = L_7;
		Type_t* L_8 = ((ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986*)__this)->___TargetType;
		Type_t* L_9 = V_0;
		NullCheck(L_8);
		bool L_10;
		L_10 = VirtualFuncInvoker1< bool, Type_t* >::Invoke(21, L_8, L_9);
		V_1 = (bool)((((int32_t)L_10) == ((int32_t)0))? 1 : 0);
		bool L_11 = V_1;
		if (!L_11)
		{
			goto IL_0064;
		}
	}
	{
		Type_t* L_12 = ((ConverterBase_t2EB97002817F3AC30B2E04CA0D0878DA5D26A986*)__this)->___TargetType;
		NullCheck(L_12);
		String_t* L_13;
		L_13 = VirtualFuncInvoker0< String_t* >::Invoke(25, L_12);
		String_t* L_14;
		L_14 = String_Format_mA8DBB4C2516B9723C5A41E6CB1E2FAF4BBE96DD8(((String_t*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&_stringLiteralA0ED9B677776CE9870AC154CB66E1B887B6E6A33)), L_13, NULL);
		NotSupportedException_t1429765983D409BD2986508963C98D214E4EBF4A* L_15 = (NotSupportedException_t1429765983D409BD2986508963C98D214E4EBF4A*)il2cpp_codegen_object_new(((RuntimeClass*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&NotSupportedException_t1429765983D409BD2986508963C98D214E4EBF4A_il2cpp_TypeInfo_var)));
		NotSupportedException__ctor_mE174750CF0247BBB47544FFD71D66BB89630945B(L_15, L_14, NULL);
		IL2CPP_RAISE_MANAGED_EXCEPTION(L_15, ((RuntimeMethod*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&EnumerableConverter_DeserializeArray_m3FE8044084F9036E98E38F94C8BE5770B9AB8EF9_RuntimeMethod_var)));
	}

IL_0064:
	{
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_16 = ___1_arrayValue;
		il2cpp_codegen_runtime_class_init_inline(FirestoreCpp_t1169FEBB415417F3CA93CB88454A962A09744644_il2cpp_TypeInfo_var);
		FieldValueVector_tC122E2EBD2D537A9B562AE821FBD088D90659ADE* L_17;
		L_17 = FirestoreCpp_ConvertFieldValueToVector_m68155CF52D07773C4BBF33642320E8BEC05F354C(L_16, NULL);
		V_2 = L_17;
	}
	{
		auto __finallyBlock = il2cpp::utils::Finally([&]
		{

FINALLY_00de:
			{
				{
					FieldValueVector_tC122E2EBD2D537A9B562AE821FBD088D90659ADE* L_18 = V_2;
					if (!L_18)
					{
						goto IL_00e8;
					}
				}
				{
					FieldValueVector_tC122E2EBD2D537A9B562AE821FBD088D90659ADE* L_19 = V_2;
					NullCheck(L_19);
					InterfaceActionInvoker0::Invoke(0, IDisposable_t030E0496B4E0E4E4F086825007979AF51F7248C5_il2cpp_TypeInfo_var, L_19);
				}

IL_00e8:
				{
					return;
				}
			}
		});
		try
		{
			{
				FieldValueVector_tC122E2EBD2D537A9B562AE821FBD088D90659ADE* L_20 = V_2;
				NullCheck(L_20);
				uint32_t L_21;
				L_21 = FieldValueVector_Size_m6025FB407D221BE61E57DB3A5AA2FE5C3CEB1E07(L_20, NULL);
				V_3 = L_21;
				uint32_t L_22 = V_3;
				V_5 = (bool)((!(((uint32_t)L_22) <= ((uint32_t)((int32_t)2147483647LL))))? 1 : 0);
				bool L_23 = V_5;
				if (!L_23)
				{
					goto IL_008d_1;
				}
			}
			{
				ArgumentException_tAD90411542A20A9C72D5CDA3A84181D8B947A263* L_24 = (ArgumentException_tAD90411542A20A9C72D5CDA3A84181D8B947A263*)il2cpp_codegen_object_new(((RuntimeClass*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&ArgumentException_tAD90411542A20A9C72D5CDA3A84181D8B947A263_il2cpp_TypeInfo_var)));
				ArgumentException__ctor_m026938A67AF9D36BB7ED27F80425D7194B514465(L_24, ((String_t*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&_stringLiteral463DC12B654027ACC00118CEE9908C874B745191)), NULL);
				IL2CPP_RAISE_MANAGED_EXCEPTION(L_24, ((RuntimeMethod*)il2cpp_codegen_initialize_runtime_metadata_inline((uintptr_t*)&EnumerableConverter_DeserializeArray_m3FE8044084F9036E98E38F94C8BE5770B9AB8EF9_RuntimeMethod_var)));
			}

IL_008d_1:
			{
				Type_t* L_25 = V_0;
				RuntimeObject* L_26;
				L_26 = Activator_CreateInstance_mFF030428C64FDDFACC74DFAC97388A1C628BFBCF(L_25, NULL);
				V_4 = ((RuntimeObject*)Castclass((RuntimeObject*)L_26, IList_t1C522956D79B7DC92B5B01053DF1AC058C8B598D_il2cpp_TypeInfo_var));
				V_6 = 0;
				goto IL_00cb_1;
			}

IL_009f_1:
			{
				FieldValueVector_tC122E2EBD2D537A9B562AE821FBD088D90659ADE* L_27 = V_2;
				int32_t L_28 = V_6;
				NullCheck(L_27);
				FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_29;
				L_29 = FieldValueVector_GetUnsafeView_m9967EF1F902FAA891F3E31F6D4643C343C279EDD(L_27, L_28, NULL);
				V_7 = L_29;
				DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* L_30 = ___0_context;
				FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_31 = V_7;
				Type_t* L_32 = __this->____elementType;
				RuntimeObject* L_33;
				L_33 = ValueDeserializer_Deserialize_m27707281E147BAEB5786DC18DE5DA47065AEEE49(L_30, L_31, L_32, NULL);
				V_8 = L_33;
				RuntimeObject* L_34 = V_4;
				RuntimeObject* L_35 = V_8;
				NullCheck(L_34);
				int32_t L_36;
				L_36 = InterfaceFuncInvoker1< int32_t, RuntimeObject* >::Invoke(2, IList_t1C522956D79B7DC92B5B01053DF1AC058C8B598D_il2cpp_TypeInfo_var, L_34, L_35);
				int32_t L_37 = V_6;
				V_6 = ((int32_t)il2cpp_codegen_add(L_37, 1));
			}

IL_00cb_1:
			{
				int32_t L_38 = V_6;
				int64_t L_39 = (il2cpp_codegen_conv<int64_t,int32_t,int32_t,false,false>(L_38,NULL));
				uint32_t L_40 = V_3;
				uint64_t L_41 = (il2cpp_codegen_conv<uint64_t,uint32_t,int32_t,false,false>(L_40,NULL));
				V_9 = (bool)((((int64_t)L_39) < ((int64_t)L_41))? 1 : 0);
				bool L_42 = V_9;
				if (L_42)
				{
					goto IL_009f_1;
				}
			}
			{
				RuntimeObject* L_43 = V_4;
				V_10 = L_43;
				goto IL_00e9;
			}
		}
		catch(Il2CppNativeThreadAbortException&)
		{
			__finallyBlock.SetNativeThreadAbortOccurred();
		}
		catch(Il2CppExceptionWrapper& e)
		{
			__finallyBlock.StoreException(e.ex);
		}
	}

IL_00e9:
	{
		RuntimeObject* L_44 = V_10;
		return L_44;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71434
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void U3CU3Ec__cctor_m62DF45EF454BD9BEDC42954DB0A48C44689ACDC9 (const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01* L_0 = (U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01*)il2cpp_codegen_object_new(U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_il2cpp_TypeInfo_var);
		U3CU3Ec__ctor_m97087E5D1803B984D47CAAC621D01C8810A2531B(L_0, NULL);
		((U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_StaticFields*)il2cpp_codegen_static_fields_for(U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_il2cpp_TypeInfo_var))->___U3CU3E9 = L_0;
		Il2CppCodeGenWriteBarrier((void**)(&((U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_StaticFields*)il2cpp_codegen_static_fields_for(U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01_il2cpp_TypeInfo_var))->___U3CU3E9), (void*)L_0);
		return;
	}
}
// Method Definition Index: 71435
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void U3CU3Ec__ctor_m97087E5D1803B984D47CAAC621D01C8810A2531B (U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		Object__ctor_mE837C6B9FA8C6D5D109F4B2EC885D79919AC0EA2(__this, NULL);
		return;
	}
}
// Method Definition Index: 71436
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR bool U3CU3Ec_U3C_ctorU3Eb__1_0_mC65EA465ADE3F30333D7A4AD80443952B0BAAF40 (U3CU3Ec_t6ED32FAB7F9B21D146F8536FBD5878B4F1EA1A01* __this, Type_t* ___0_iface, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&IEnumerable_1_t6D39F4BC58A66D98BCEB112169CFDE48809FC555_0_0_0_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	int32_t G_B3_0 = 0;
	{
		Type_t* L_0 = ___0_iface;
		NullCheck(L_0);
		bool L_1;
		L_1 = VirtualFuncInvoker0< bool >::Invoke(39, L_0);
		if (!L_1)
		{
			goto IL_001f;
		}
	}
	{
		Type_t* L_2 = ___0_iface;
		NullCheck(L_2);
		Type_t* L_3;
		L_3 = VirtualFuncInvoker0< Type_t* >::Invoke(47, L_2);
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_4 = { reinterpret_cast<intptr_t> (IEnumerable_1_t6D39F4BC58A66D98BCEB112169CFDE48809FC555_0_0_0_var) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_5;
		L_5 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_4, NULL);
		bool L_6;
		L_6 = Type_op_Equality_m99930A0E44E420A685FABA60E60BA1CC5FA0EBDC(L_3, L_5, NULL);
		G_B3_0 = ((int32_t)(L_6));
		goto IL_0020;
	}

IL_001f:
	{
		G_B3_0 = 0;
	}

IL_0020:
	{
		return (bool)G_B3_0;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71437
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void EnumerableConverterBase__ctor_mED2B3485AD8ABC73CB9892B5BFA2A8526266783D (EnumerableConverterBase_tDF9B3A0A205608610843CF474E57F38B0154810C* __this, Type_t* ___0_targetType, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		Type_t* L_0 = ___0_targetType;
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_0, NULL);
		return;
	}
}
// Method Definition Index: 71438
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* EnumerableConverterBase_Serialize_m94E55444C5F7601A6044CF3780710217D45E45E1 (EnumerableConverterBase_tDF9B3A0A205608610843CF474E57F38B0154810C* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&IDisposable_t030E0496B4E0E4E4F086825007979AF51F7248C5_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&IEnumerable_t6331596D5DD37C462B1B8D49CF6B319B00AB7131_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&IEnumerator_t7B609C2FFA6EB5167D9C62A0C32A21DE2F666DAA_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&List_1_Add_mA15F138468E54860B5D7176DDD482A6AD1AEEE48_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&List_1__ctor_mA82BCBDC55CC01D88B9EE7A40D56AFD92FD5634E_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&List_1_tBA97A62E49F18775E9FBE6AAE127D28F79FA87CB_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	List_1_tBA97A62E49F18775E9FBE6AAE127D28F79FA87CB* V_0 = NULL;
	RuntimeObject* V_1 = NULL;
	RuntimeObject* V_2 = NULL;
	FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* V_3 = NULL;
	RuntimeObject* V_4 = NULL;
	FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* V_5 = NULL;
	{
		List_1_tBA97A62E49F18775E9FBE6AAE127D28F79FA87CB* L_0 = (List_1_tBA97A62E49F18775E9FBE6AAE127D28F79FA87CB*)il2cpp_codegen_object_new(List_1_tBA97A62E49F18775E9FBE6AAE127D28F79FA87CB_il2cpp_TypeInfo_var);
		List_1__ctor_mA82BCBDC55CC01D88B9EE7A40D56AFD92FD5634E(L_0, List_1__ctor_mA82BCBDC55CC01D88B9EE7A40D56AFD92FD5634E_RuntimeMethod_var);
		V_0 = L_0;
		RuntimeObject* L_1 = ___1_value;
		NullCheck(((RuntimeObject*)Castclass((RuntimeObject*)L_1, IEnumerable_t6331596D5DD37C462B1B8D49CF6B319B00AB7131_il2cpp_TypeInfo_var)));
		RuntimeObject* L_2;
		L_2 = InterfaceFuncInvoker0< RuntimeObject* >::Invoke(0, IEnumerable_t6331596D5DD37C462B1B8D49CF6B319B00AB7131_il2cpp_TypeInfo_var, ((RuntimeObject*)Castclass((RuntimeObject*)L_1, IEnumerable_t6331596D5DD37C462B1B8D49CF6B319B00AB7131_il2cpp_TypeInfo_var)));
		V_1 = L_2;
	}
	{
		auto __finallyBlock = il2cpp::utils::Finally([&]
		{

FINALLY_0039:
			{
				{
					RuntimeObject* L_3 = V_1;
					V_4 = ((RuntimeObject*)IsInst((RuntimeObject*)L_3, IDisposable_t030E0496B4E0E4E4F086825007979AF51F7248C5_il2cpp_TypeInfo_var));
					RuntimeObject* L_4 = V_4;
					if (!L_4)
					{
						goto IL_004d;
					}
				}
				{
					RuntimeObject* L_5 = V_4;
					NullCheck(L_5);
					InterfaceActionInvoker0::Invoke(0, IDisposable_t030E0496B4E0E4E4F086825007979AF51F7248C5_il2cpp_TypeInfo_var, L_5);
				}

IL_004d:
				{
					return;
				}
			}
		});
		try
		{
			{
				goto IL_002f_1;
			}

IL_0016_1:
			{
				RuntimeObject* L_6 = V_1;
				NullCheck(L_6);
				RuntimeObject* L_7;
				L_7 = InterfaceFuncInvoker0< RuntimeObject* >::Invoke(1, IEnumerator_t7B609C2FFA6EB5167D9C62A0C32A21DE2F666DAA_il2cpp_TypeInfo_var, L_6);
				V_2 = L_7;
				SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* L_8 = ___0_context;
				RuntimeObject* L_9 = V_2;
				FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_10;
				L_10 = ValueSerializer_Serialize_m2117726A27431810E2CA304A113870F7377C8035(L_8, L_9, NULL);
				V_3 = L_10;
				List_1_tBA97A62E49F18775E9FBE6AAE127D28F79FA87CB* L_11 = V_0;
				FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_12 = V_3;
				NullCheck(L_11);
				List_1_Add_mA15F138468E54860B5D7176DDD482A6AD1AEEE48_inline(L_11, L_12, List_1_Add_mA15F138468E54860B5D7176DDD482A6AD1AEEE48_RuntimeMethod_var);
			}

IL_002f_1:
			{
				RuntimeObject* L_13 = V_1;
				NullCheck(L_13);
				bool L_14;
				L_14 = InterfaceFuncInvoker0< bool >::Invoke(0, IEnumerator_t7B609C2FFA6EB5167D9C62A0C32A21DE2F666DAA_il2cpp_TypeInfo_var, L_13);
				if (L_14)
				{
					goto IL_0016_1;
				}
			}
			{
				goto IL_004e;
			}
		}
		catch(Il2CppNativeThreadAbortException&)
		{
			__finallyBlock.SetNativeThreadAbortOccurred();
		}
		catch(Il2CppExceptionWrapper& e)
		{
			__finallyBlock.StoreException(e.ex);
		}
	}

IL_004e:
	{
		List_1_tBA97A62E49F18775E9FBE6AAE127D28F79FA87CB* L_15 = V_0;
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_16;
		L_16 = ConverterBase_ConvertToProxyArray_m6BDE19B39EA62551E8AA93ABF328995D8045D445(L_15, NULL);
		V_5 = L_16;
		goto IL_0058;
	}

IL_0058:
	{
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_17 = V_5;
		return L_17;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71443
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void MapConverterBase__ctor_m9E9E142347C2CED0E133610BD909AABDF1EF1B00 (MapConverterBase_tB74722C6C09BD0135DB6428DBDCA720402A459E3* __this, Type_t* ___0_targetType, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		Type_t* L_0 = ___0_targetType;
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_0, NULL);
		return;
	}
}
// Method Definition Index: 71444
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* MapConverterBase_Serialize_mB7E80C6A7633AF0A24766CA0FAD6B1666E7EF83B (MapConverterBase_tB74722C6C09BD0135DB6428DBDCA720402A459E3* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Dictionary_2__ctor_mEFBE7A31B17F88B49904A09737C23C6D9489E210_RuntimeMethod_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Dictionary_2_t7CC7577BE304ED34533E9BABC0EB2AA8A73D2BE8_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	Dictionary_2_t7CC7577BE304ED34533E9BABC0EB2AA8A73D2BE8* V_0 = NULL;
	FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* V_1 = NULL;
	{
		Dictionary_2_t7CC7577BE304ED34533E9BABC0EB2AA8A73D2BE8* L_0 = (Dictionary_2_t7CC7577BE304ED34533E9BABC0EB2AA8A73D2BE8*)il2cpp_codegen_object_new(Dictionary_2_t7CC7577BE304ED34533E9BABC0EB2AA8A73D2BE8_il2cpp_TypeInfo_var);
		Dictionary_2__ctor_mEFBE7A31B17F88B49904A09737C23C6D9489E210(L_0, Dictionary_2__ctor_mEFBE7A31B17F88B49904A09737C23C6D9489E210_RuntimeMethod_var);
		V_0 = L_0;
		SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* L_1 = ___0_context;
		RuntimeObject* L_2 = ___1_value;
		Dictionary_2_t7CC7577BE304ED34533E9BABC0EB2AA8A73D2BE8* L_3 = V_0;
		VirtualActionInvoker3< SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D*, RuntimeObject*, RuntimeObject* >::Invoke(11, __this, L_1, L_2, L_3);
		Dictionary_2_t7CC7577BE304ED34533E9BABC0EB2AA8A73D2BE8* L_4 = V_0;
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_5;
		L_5 = ConverterBase_ConvertToProxyMap_m765B9DDCD60793910D785A66FFE3B2D678A7A48D(L_4, NULL);
		V_1 = L_5;
		goto IL_001a;
	}

IL_001a:
	{
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_6 = V_1;
		return L_6;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71445
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void StringConverter__ctor_mB4E28DBBCB593C8B0B104E17EF3F53F8F6E2186D (StringConverter_tE3ACF1666C7A43A5ED0ED035D3A21A4527EFF33A* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (&il2cpp_defaults.string_class->byval_arg) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71446
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* StringConverter_Serialize_mAD05799AF8CBE87E5C8D1DFCEEC51D269FAA0C32 (StringConverter_tE3ACF1666C7A43A5ED0ED035D3A21A4527EFF33A* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_1;
		L_1 = FieldValueProxy_String_m45A5D4AF9B37E93E7AA12DF0984BC669729F228C(((String_t*)CastclassSealed((RuntimeObject*)L_0, il2cpp_defaults.string_class)), NULL);
		return L_1;
	}
}
// Method Definition Index: 71447
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* StringConverter_DeserializeString_m5DBF8001A288190585CB573C94EFCA0EAAB79A37 (StringConverter_tE3ACF1666C7A43A5ED0ED035D3A21A4527EFF33A* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, String_t* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		String_t* L_0 = ___1_value;
		return L_0;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71448
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void IntegerConverterBase__ctor_mA9476A3DF7B140631E1386724E61EA81FFE0893F (IntegerConverterBase_tFD031194A307F60CD0CAB0368F8169B87D3B1749* __this, Type_t* ___0_type, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		Type_t* L_0 = ___0_type;
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_0, NULL);
		return;
	}
}
// Method Definition Index: 71449
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* IntegerConverterBase_DeserializeDouble_mCD20BDEFC96DA44E122A69BF03A993BCA048B752 (IntegerConverterBase_tFD031194A307F60CD0CAB0368F8169B87D3B1749* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, double ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&IntegerConverterBase_DeserializeDouble_mCD20BDEFC96DA44E122A69BF03A993BCA048B752_RuntimeMethod_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* L_0 = ___0_context;
		double L_1 = ___1_value;
		int64_t L_2 = (il2cpp_codegen_conv<int64_t,double,double,true,false>(L_1,IntegerConverterBase_DeserializeDouble_mCD20BDEFC96DA44E122A69BF03A993BCA048B752_RuntimeMethod_var));
		RuntimeObject* L_3;
		L_3 = VirtualFuncInvoker2< RuntimeObject*, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E*, int64_t >::Invoke(17, __this, L_0, L_2);
		return L_3;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71450
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void ByteConverter__ctor_mFC325B5FD5453EFB5D7F3A362AAD6AFB135D7BAD (ByteConverter_tA676FFBC239BA57CE9A77C4CAE57A5ACA66679FC* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (&il2cpp_defaults.byte_class->byval_arg) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		IntegerConverterBase__ctor_mA9476A3DF7B140631E1386724E61EA81FFE0893F(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71451
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* ByteConverter_Serialize_mE845263FED561D71296272B9380FC5D64175DB74 (ByteConverter_tA676FFBC239BA57CE9A77C4CAE57A5ACA66679FC* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		uint64_t L_1 = (il2cpp_codegen_conv<uint64_t,uint8_t,int32_t,false,false>(((*(uint8_t*)UnBox(L_0, il2cpp_defaults.byte_class))),NULL));
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_2;
		L_2 = FieldValueProxy_Integer_m6AC6B4312C9F6FE596EB30CAC84F75F9BA2DF1E6((int64_t)L_1, NULL);
		return L_2;
	}
}
// Method Definition Index: 71452
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* ByteConverter_DeserializeInteger_m75366C8C52D7A8E3C45B7AD38DBAE758E8C0BA9A (ByteConverter_tA676FFBC239BA57CE9A77C4CAE57A5ACA66679FC* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, int64_t ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&ByteConverter_DeserializeInteger_m75366C8C52D7A8E3C45B7AD38DBAE758E8C0BA9A_RuntimeMethod_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		int64_t L_0 = ___1_value;
		uint8_t L_1 = (il2cpp_codegen_conv<uint8_t,int64_t,int64_t,true,false>(L_0,ByteConverter_DeserializeInteger_m75366C8C52D7A8E3C45B7AD38DBAE758E8C0BA9A_RuntimeMethod_var));
		uint8_t L_2 = L_1;
		RuntimeObject* L_3 = Box(il2cpp_defaults.byte_class, &L_2);
		return L_3;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71453
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void SByteConverter__ctor_m8DF21A6C65A36F46C63DBBA7288B6438CB586765 (SByteConverter_t878367D86AB2143AC558AB69487A33F5FC3D7FD0* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (&il2cpp_defaults.sbyte_class->byval_arg) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		IntegerConverterBase__ctor_mA9476A3DF7B140631E1386724E61EA81FFE0893F(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71454
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* SByteConverter_Serialize_mCCDD0AA5150C35F862D7A80EC73BD4A57DEAE25A (SByteConverter_t878367D86AB2143AC558AB69487A33F5FC3D7FD0* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		int64_t L_1 = (il2cpp_codegen_conv<int64_t,int8_t,int32_t,false,false>(((*(int8_t*)UnBox(L_0, il2cpp_defaults.sbyte_class))),NULL));
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_2;
		L_2 = FieldValueProxy_Integer_m6AC6B4312C9F6FE596EB30CAC84F75F9BA2DF1E6(L_1, NULL);
		return L_2;
	}
}
// Method Definition Index: 71455
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* SByteConverter_DeserializeInteger_m756B896D761C10275AE95BB4446D5872C5FD1AD7 (SByteConverter_t878367D86AB2143AC558AB69487A33F5FC3D7FD0* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, int64_t ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&SByteConverter_DeserializeInteger_m756B896D761C10275AE95BB4446D5872C5FD1AD7_RuntimeMethod_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		int64_t L_0 = ___1_value;
		int8_t L_1 = (il2cpp_codegen_conv<int8_t,int64_t,int64_t,true,false>(L_0,SByteConverter_DeserializeInteger_m756B896D761C10275AE95BB4446D5872C5FD1AD7_RuntimeMethod_var));
		int8_t L_2 = L_1;
		RuntimeObject* L_3 = Box(il2cpp_defaults.sbyte_class, &L_2);
		return L_3;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71456
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void Int16Converter__ctor_m5B896AE510E0FE57A2DA3F09F90706D53E01F118 (Int16Converter_t7164A70E8D6EE2EA90E75205A9D842833F195E3B* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (&il2cpp_defaults.int16_class->byval_arg) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		IntegerConverterBase__ctor_mA9476A3DF7B140631E1386724E61EA81FFE0893F(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71457
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* Int16Converter_Serialize_mEB0028D417CBFA5D5352B64E78D731255275E009 (Int16Converter_t7164A70E8D6EE2EA90E75205A9D842833F195E3B* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		int64_t L_1 = (il2cpp_codegen_conv<int64_t,int16_t,int32_t,false,false>(((*(int16_t*)UnBox(L_0, il2cpp_defaults.int16_class))),NULL));
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_2;
		L_2 = FieldValueProxy_Integer_m6AC6B4312C9F6FE596EB30CAC84F75F9BA2DF1E6(L_1, NULL);
		return L_2;
	}
}
// Method Definition Index: 71458
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* Int16Converter_DeserializeInteger_mB51802CC353F9A8092891D6FC0FE1DE6BAD31A84 (Int16Converter_t7164A70E8D6EE2EA90E75205A9D842833F195E3B* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, int64_t ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Int16Converter_DeserializeInteger_mB51802CC353F9A8092891D6FC0FE1DE6BAD31A84_RuntimeMethod_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		int64_t L_0 = ___1_value;
		int16_t L_1 = (il2cpp_codegen_conv<int16_t,int64_t,int64_t,true,false>(L_0,Int16Converter_DeserializeInteger_mB51802CC353F9A8092891D6FC0FE1DE6BAD31A84_RuntimeMethod_var));
		int16_t L_2 = L_1;
		RuntimeObject* L_3 = Box(il2cpp_defaults.int16_class, &L_2);
		return L_3;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71459
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void UInt16Converter__ctor_m5613B6AC8405974D2174FF9D7B48397752CA1F33 (UInt16Converter_tDC237C86A6C6C07A47254910EACA583EF49DCF97* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (&il2cpp_defaults.uint16_class->byval_arg) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		IntegerConverterBase__ctor_mA9476A3DF7B140631E1386724E61EA81FFE0893F(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71460
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* UInt16Converter_Serialize_m5DBA714FA86017847C15971F9F7244AE25438F07 (UInt16Converter_tDC237C86A6C6C07A47254910EACA583EF49DCF97* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		uint64_t L_1 = (il2cpp_codegen_conv<uint64_t,uint16_t,int32_t,false,false>(((*(uint16_t*)UnBox(L_0, il2cpp_defaults.uint16_class))),NULL));
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_2;
		L_2 = FieldValueProxy_Integer_m6AC6B4312C9F6FE596EB30CAC84F75F9BA2DF1E6((int64_t)L_1, NULL);
		return L_2;
	}
}
// Method Definition Index: 71461
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* UInt16Converter_DeserializeInteger_mBB92F046B498A47235E6D5C61E1D4DF5D139D71A (UInt16Converter_tDC237C86A6C6C07A47254910EACA583EF49DCF97* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, int64_t ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&UInt16Converter_DeserializeInteger_mBB92F046B498A47235E6D5C61E1D4DF5D139D71A_RuntimeMethod_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		int64_t L_0 = ___1_value;
		uint16_t L_1 = (il2cpp_codegen_conv<uint16_t,int64_t,int64_t,true,false>(L_0,UInt16Converter_DeserializeInteger_mBB92F046B498A47235E6D5C61E1D4DF5D139D71A_RuntimeMethod_var));
		uint16_t L_2 = L_1;
		RuntimeObject* L_3 = Box(il2cpp_defaults.uint16_class, &L_2);
		return L_3;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71462
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void Int32Converter__ctor_m694D9FF17B5E75F13744C0685A0056EEAB449C79 (Int32Converter_t57F1559BACE26877F76CE073B9A5614C37377587* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (&il2cpp_defaults.int32_class->byval_arg) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		IntegerConverterBase__ctor_mA9476A3DF7B140631E1386724E61EA81FFE0893F(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71463
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* Int32Converter_Serialize_m6CB3D05E398607DA371365687C921D60793B55C8 (Int32Converter_t57F1559BACE26877F76CE073B9A5614C37377587* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		int64_t L_1 = (il2cpp_codegen_conv<int64_t,int32_t,int32_t,false,false>(((*(int32_t*)UnBox(L_0, il2cpp_defaults.int32_class))),NULL));
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_2;
		L_2 = FieldValueProxy_Integer_m6AC6B4312C9F6FE596EB30CAC84F75F9BA2DF1E6(L_1, NULL);
		return L_2;
	}
}
// Method Definition Index: 71464
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* Int32Converter_DeserializeInteger_m0CBD454EA743313EF45C767D24B33D90CA1837D9 (Int32Converter_t57F1559BACE26877F76CE073B9A5614C37377587* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, int64_t ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Int32Converter_DeserializeInteger_m0CBD454EA743313EF45C767D24B33D90CA1837D9_RuntimeMethod_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		int64_t L_0 = ___1_value;
		int32_t L_1 = (il2cpp_codegen_conv<int32_t,int64_t,int64_t,true,false>(L_0,Int32Converter_DeserializeInteger_m0CBD454EA743313EF45C767D24B33D90CA1837D9_RuntimeMethod_var));
		int32_t L_2 = L_1;
		RuntimeObject* L_3 = Box(il2cpp_defaults.int32_class, &L_2);
		return L_3;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71465
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void UInt32Converter__ctor_m3F47AFC41ABC2B161B86393D06ECD6566D6614B8 (UInt32Converter_t37920E7844B75328507C6A82EB007A86F1892151* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (&il2cpp_defaults.uint32_class->byval_arg) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		IntegerConverterBase__ctor_mA9476A3DF7B140631E1386724E61EA81FFE0893F(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71466
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* UInt32Converter_Serialize_m65D2992F8EA3AE748D73E82C1C224CFE101755A1 (UInt32Converter_t37920E7844B75328507C6A82EB007A86F1892151* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		uint64_t L_1 = (il2cpp_codegen_conv<uint64_t,uint32_t,int32_t,false,false>(((*(uint32_t*)UnBox(L_0, il2cpp_defaults.uint32_class))),NULL));
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_2;
		L_2 = FieldValueProxy_Integer_m6AC6B4312C9F6FE596EB30CAC84F75F9BA2DF1E6((int64_t)L_1, NULL);
		return L_2;
	}
}
// Method Definition Index: 71467
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* UInt32Converter_DeserializeInteger_m26885822BC645607B2FB01500B8173B823A3441A (UInt32Converter_t37920E7844B75328507C6A82EB007A86F1892151* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, int64_t ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&UInt32Converter_DeserializeInteger_m26885822BC645607B2FB01500B8173B823A3441A_RuntimeMethod_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		int64_t L_0 = ___1_value;
		uint32_t L_1 = (il2cpp_codegen_conv<uint32_t,int64_t,int64_t,true,false>(L_0,UInt32Converter_DeserializeInteger_m26885822BC645607B2FB01500B8173B823A3441A_RuntimeMethod_var));
		uint32_t L_2 = L_1;
		RuntimeObject* L_3 = Box(il2cpp_defaults.uint32_class, &L_2);
		return L_3;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71468
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void Int64Converter__ctor_m24A6E97DFF8EC0E1647DA0CFFD9580C9FC5060CF (Int64Converter_t68449D8D48F5695BD5DBB8BFD31257B5C8B20953* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (&il2cpp_defaults.int64_class->byval_arg) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		IntegerConverterBase__ctor_mA9476A3DF7B140631E1386724E61EA81FFE0893F(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71469
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* Int64Converter_Serialize_m5B7EAE187FF1087C7FD298C95B6F349313893BEE (Int64Converter_t68449D8D48F5695BD5DBB8BFD31257B5C8B20953* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_1;
		L_1 = FieldValueProxy_Integer_m6AC6B4312C9F6FE596EB30CAC84F75F9BA2DF1E6(((*(int64_t*)UnBox(L_0, il2cpp_defaults.int64_class))), NULL);
		return L_1;
	}
}
// Method Definition Index: 71470
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* Int64Converter_DeserializeInteger_m7CB1F3B783A49669BDB04A2F227633189808AFFA (Int64Converter_t68449D8D48F5695BD5DBB8BFD31257B5C8B20953* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, int64_t ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		int64_t L_0 = ___1_value;
		int64_t L_1 = L_0;
		RuntimeObject* L_2 = Box(il2cpp_defaults.int64_class, &L_1);
		return L_2;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71471
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void UInt64Converter__ctor_m5B5B8D8F20ED9558D4E25A55719AE79AAA8A2C70 (UInt64Converter_tA7BED8E18DDF9AFC86E767A972832A7A820A566C* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (&il2cpp_defaults.uint64_class->byval_arg) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		IntegerConverterBase__ctor_mA9476A3DF7B140631E1386724E61EA81FFE0893F(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71472
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* UInt64Converter_Serialize_m7FDD59769F82F3CDFD20C55D20E5684D34A03CCD (UInt64Converter_tA7BED8E18DDF9AFC86E767A972832A7A820A566C* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_1;
		L_1 = FieldValueProxy_Integer_m6AC6B4312C9F6FE596EB30CAC84F75F9BA2DF1E6((int64_t)((*(uint64_t*)UnBox(L_0, il2cpp_defaults.uint64_class))), NULL);
		return L_1;
	}
}
// Method Definition Index: 71473
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* UInt64Converter_DeserializeInteger_mC2073BA9F288A43CB50EDC0AF8D596DFD933F893 (UInt64Converter_tA7BED8E18DDF9AFC86E767A972832A7A820A566C* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, int64_t ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&UInt64Converter_DeserializeInteger_mC2073BA9F288A43CB50EDC0AF8D596DFD933F893_RuntimeMethod_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		int64_t L_0 = ___1_value;
		uint64_t L_1 = (il2cpp_codegen_conv<uint64_t,int64_t,int64_t,true,false>(L_0,UInt64Converter_DeserializeInteger_mC2073BA9F288A43CB50EDC0AF8D596DFD933F893_RuntimeMethod_var));
		uint64_t L_2 = L_1;
		RuntimeObject* L_3 = Box(il2cpp_defaults.uint64_class, &L_2);
		return L_3;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71474
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void SingleConverter__ctor_m9086CBD151FBB44D1B11545223F5D8829E843BBC (SingleConverter_t5DB6880D844DEC4685528999AAF0F251516DE639* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (&il2cpp_defaults.single_class->byval_arg) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71475
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* SingleConverter_Serialize_m1DFF98D5229ABF0616828F2BD4AE6979BF664616 (SingleConverter_t5DB6880D844DEC4685528999AAF0F251516DE639* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		double L_1 = (il2cpp_codegen_conv<double,float,float,false,false>(((*(float*)UnBox(L_0, il2cpp_defaults.single_class))),NULL));
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_2;
		L_2 = FieldValueProxy_Double_m76A3BCA369286127F50850D75F414C2317E2E1F5(L_1, NULL);
		return L_2;
	}
}
// Method Definition Index: 71476
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* SingleConverter_DeserializeDouble_mB961241C8778BB908BE597342F00B6D98C0C1AA1 (SingleConverter_t5DB6880D844DEC4685528999AAF0F251516DE639* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, double ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		double L_0 = ___1_value;
		float L_1 = (il2cpp_codegen_conv<float,double,double,false,false>(L_0,NULL));
		float L_2 = L_1;
		RuntimeObject* L_3 = Box(il2cpp_defaults.single_class, &L_2);
		return L_3;
	}
}
// Method Definition Index: 71477
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* SingleConverter_DeserializeInteger_m13F0D4799B0A00DC8ED8DC14B5FC787AC23A185C (SingleConverter_t5DB6880D844DEC4685528999AAF0F251516DE639* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, int64_t ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		int64_t L_0 = ___1_value;
		float L_1 = (il2cpp_codegen_conv<float,int64_t,int64_t,false,false>(L_0,NULL));
		float L_2 = L_1;
		RuntimeObject* L_3 = Box(il2cpp_defaults.single_class, &L_2);
		return L_3;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71478
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DoubleConverter__ctor_mF5F5573F321FDA0AB37ECB051B22BE83F4CE5931 (DoubleConverter_t6E78FF273149A7409508A304891B4322DDF611B4* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (&il2cpp_defaults.double_class->byval_arg) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71479
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* DoubleConverter_Serialize_mD1FCD799FB5216CEE9EBEDF3449B9463959E77E8 (DoubleConverter_t6E78FF273149A7409508A304891B4322DDF611B4* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_1;
		L_1 = FieldValueProxy_Double_m76A3BCA369286127F50850D75F414C2317E2E1F5(((*(double*)UnBox(L_0, il2cpp_defaults.double_class))), NULL);
		return L_1;
	}
}
// Method Definition Index: 71480
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* DoubleConverter_DeserializeDouble_mE7A5F318C5A25C9482DFF813FD9D2C43DE6D0932 (DoubleConverter_t6E78FF273149A7409508A304891B4322DDF611B4* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, double ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		double L_0 = ___1_value;
		double L_1 = L_0;
		RuntimeObject* L_2 = Box(il2cpp_defaults.double_class, &L_1);
		return L_2;
	}
}
// Method Definition Index: 71481
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* DoubleConverter_DeserializeInteger_mD127B2E56D574E946745ADB0F426590481C3FAE4 (DoubleConverter_t6E78FF273149A7409508A304891B4322DDF611B4* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, int64_t ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		int64_t L_0 = ___1_value;
		double L_1 = (il2cpp_codegen_conv<double,int64_t,int64_t,false,false>(L_0,NULL));
		double L_2 = L_1;
		RuntimeObject* L_3 = Box(il2cpp_defaults.double_class, &L_2);
		return L_3;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71482
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void BooleanConverter__ctor_mBDD68794FE108535DE5042C1A0CC225566321AE5 (BooleanConverter_t413CD06B6AFB2069B97F4F69B4D5B54A7103F43E* __this, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (&il2cpp_defaults.boolean_class->byval_arg) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71483
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* BooleanConverter_Serialize_mC534965D963068175B19BAFA569AF87764491CD3 (BooleanConverter_t413CD06B6AFB2069B97F4F69B4D5B54A7103F43E* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_1;
		L_1 = FieldValueProxy_Boolean_mEF3E203D36D40EBB1F75F2C0F22D360946BB42ED(((*(bool*)UnBox(L_0, il2cpp_defaults.boolean_class))), NULL);
		return L_1;
	}
}
// Method Definition Index: 71484
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* BooleanConverter_DeserializeBoolean_mB6489961CAABF117124CFFF48E1EBF3202514795 (BooleanConverter_t413CD06B6AFB2069B97F4F69B4D5B54A7103F43E* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, bool ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		bool L_0 = ___1_value;
		bool L_1 = L_0;
		RuntimeObject* L_2 = Box(il2cpp_defaults.boolean_class, &L_1);
		return L_2;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71485
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void TimestampConverter__ctor_m26273B8B45C7E5B7CC011C58FE93131E2C53367B (TimestampConverter_t334CE72D4B7105AA99405E53ADC81B5C4C246D1E* __this, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_0_0_0_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_0_0_0_var) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71486
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* TimestampConverter_Serialize_m9B0B0EE5DDDA8CA76D18AF0CAB23B0FCC4DE8670 (TimestampConverter_t334CE72D4B7105AA99405E53ADC81B5C4C246D1E* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3 V_0;
	memset((&V_0), 0, sizeof(V_0));
	{
		RuntimeObject* L_0 = ___1_value;
		V_0 = ((*(Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3*)UnBox(L_0, Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_il2cpp_TypeInfo_var)));
		il2cpp_codegen_runtime_class_init_inline(Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_il2cpp_TypeInfo_var);
		TimestampProxy_t62B4D8B5017180CFD050625E52B3F07CB596BFC3* L_1;
		L_1 = Timestamp_ConvertToProxy_mFFE2890F49BC2F29631E02573F4EA3DA50DBEA96((&V_0), NULL);
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_2;
		L_2 = FieldValueProxy_Timestamp_mAAD511133BE8E83375DFA072072CACCE16EE8DE9(L_1, NULL);
		return L_2;
	}
}
// Method Definition Index: 71487
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* TimestampConverter_DeserializeTimestamp_m70421B48E029A0B0DC1E16E22A1E79A2CFB8AB17 (TimestampConverter_t334CE72D4B7105AA99405E53ADC81B5C4C246D1E* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3 ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3 L_0 = ___1_value;
		Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3 L_1 = L_0;
		RuntimeObject* L_2 = Box(Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_il2cpp_TypeInfo_var, &L_1);
		return L_2;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71488
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void GeoPointConverter__ctor_mA78116EE37089A80A2CC01CFBE3E015EB11DED71 (GeoPointConverter_tC63DED3B80C043912E1370DE8FA78D76902967FF* __this, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GeoPoint_tACACE5A3D70BEDDF601A80CBCC66735A1D9A96E0_0_0_0_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (GeoPoint_tACACE5A3D70BEDDF601A80CBCC66735A1D9A96E0_0_0_0_var) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71489
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* GeoPointConverter_Serialize_mCE7DED2E9B1DFFFF3204F9C87EFCEB69F5B70A89 (GeoPointConverter_tC63DED3B80C043912E1370DE8FA78D76902967FF* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GeoPoint_tACACE5A3D70BEDDF601A80CBCC66735A1D9A96E0_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	GeoPoint_tACACE5A3D70BEDDF601A80CBCC66735A1D9A96E0 V_0;
	memset((&V_0), 0, sizeof(V_0));
	{
		RuntimeObject* L_0 = ___1_value;
		V_0 = ((*(GeoPoint_tACACE5A3D70BEDDF601A80CBCC66735A1D9A96E0*)UnBox(L_0, GeoPoint_tACACE5A3D70BEDDF601A80CBCC66735A1D9A96E0_il2cpp_TypeInfo_var)));
		GeoPointProxy_t01FBB939675E91CACA5D94712514DA430CD46968* L_1;
		L_1 = GeoPoint_ConvertToProxy_mCDD545EB1CF5E75BB2C427B1DB0EA4BA9EC79A1B((&V_0), NULL);
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_2;
		L_2 = FieldValueProxy_GeoPoint_m2CC1F9750816A0272DD76676D37E3A985080D567(L_1, NULL);
		return L_2;
	}
}
// Method Definition Index: 71490
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* GeoPointConverter_DeserializeGeoPoint_m9EB968D578A7ED2DB9CCED057D36A7CED8F1D7B4 (GeoPointConverter_tC63DED3B80C043912E1370DE8FA78D76902967FF* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, GeoPoint_tACACE5A3D70BEDDF601A80CBCC66735A1D9A96E0 ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&GeoPoint_tACACE5A3D70BEDDF601A80CBCC66735A1D9A96E0_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		GeoPoint_tACACE5A3D70BEDDF601A80CBCC66735A1D9A96E0 L_0 = ___1_value;
		GeoPoint_tACACE5A3D70BEDDF601A80CBCC66735A1D9A96E0 L_1 = L_0;
		RuntimeObject* L_2 = Box(GeoPoint_tACACE5A3D70BEDDF601A80CBCC66735A1D9A96E0_il2cpp_TypeInfo_var, &L_1);
		return L_2;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71491
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void ByteArrayConverter__ctor_mBD1F09EBAB7411960681E0A080DDC43CCB47EE5C (ByteArrayConverter_tFC576D6F861A6A5D054DD2D1C14D90FD491309ED* __this, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031_0_0_0_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031_0_0_0_var) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71492
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* ByteArrayConverter_Serialize_mE6D4DFBC356AB944C030B000948563A4C0E8F21E (ByteArrayConverter_tFC576D6F861A6A5D054DD2D1C14D90FD491309ED* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_1;
		L_1 = ConverterBase_ConvertToProxyBlob_m31ECFB2070A2EDCCC43CDD41CBEB105E9579D160(((ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031*)Castclass((RuntimeObject*)L_0, ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031_il2cpp_TypeInfo_var)), NULL);
		return L_1;
	}
}
// Method Definition Index: 71493
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* ByteArrayConverter_DeserializeBytes_m8999DBC45439623A82D6BC8C3988A3389D929533 (ByteArrayConverter_tFC576D6F861A6A5D054DD2D1C14D90FD491309ED* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031* L_0 = ___1_value;
		return (RuntimeObject*)L_0;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71494
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void BlobConverter__ctor_m8142753A6C7B938E154FBFEFCC4438C53E41A0D0 (BlobConverter_t7A6588D9EF3D39EEC09A6193CDF832D15A2EBC6D* __this, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35_0_0_0_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35_0_0_0_var) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71495
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* BlobConverter_Serialize_mD5F5AF5A2F5E68F73CE0B0E8AD01D54A0BC5636D (BlobConverter_t7A6588D9EF3D39EEC09A6193CDF832D15A2EBC6D* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35 V_0;
	memset((&V_0), 0, sizeof(V_0));
	{
		RuntimeObject* L_0 = ___1_value;
		V_0 = ((*(Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35*)UnBox(L_0, Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35_il2cpp_TypeInfo_var)));
		ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031* L_1;
		L_1 = Blob_ToBytes_mE56B7434FF107913B005531F2B3A93696288A360((&V_0), NULL);
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_2;
		L_2 = ConverterBase_ConvertToProxyBlob_m31ECFB2070A2EDCCC43CDD41CBEB105E9579D160(L_1, NULL);
		return L_2;
	}
}
// Method Definition Index: 71496
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* BlobConverter_DeserializeBytes_m9FC7288F6F81B7EBA73F3933273B09B2F56687B7 (BlobConverter_t7A6588D9EF3D39EEC09A6193CDF832D15A2EBC6D* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031* ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		ByteU5BU5D_tA6237BF417AE52AD70CFB4EF24A7A82613DF9031* L_0 = ___1_value;
		Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35 L_1;
		L_1 = Blob_CopyFrom_mFB8663B1E622D584118854CD1FC3394FFF134496(L_0, NULL);
		Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35 L_2 = L_1;
		RuntimeObject* L_3 = Box(Blob_t313307C797F1440CD0FA87FFC0A9BDB9EA865E35_il2cpp_TypeInfo_var, &L_2);
		return L_3;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71497
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void FieldValueProxyConverter__ctor_m414C822AA810FFEFB76C3D47E0A7B07962D6B3F3 (FieldValueProxyConverter_t8075153C7E9CB3F49FE2D8F52755947F9751897F* __this, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26_0_0_0_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26_0_0_0_var) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71498
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* FieldValueProxyConverter_Serialize_mF8D266B7428391B0FC96BFB5F0AA5572B19C72D9 (FieldValueProxyConverter_t8075153C7E9CB3F49FE2D8F52755947F9751897F* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		return ((FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26*)CastclassClass((RuntimeObject*)L_0, FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26_il2cpp_TypeInfo_var));
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71499
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DateTimeConverter__ctor_m0FEEC838E0893B955D2ADA84D073F2E90D396294 (DateTimeConverter_t414F0BA1D7E783E6AA182523D5A665E835379C4F* __this, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D_0_0_0_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D_0_0_0_var) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71500
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* DateTimeConverter_Serialize_m9FAAB46144459F6B24B0B49A38A1F04AD4581A0B (DateTimeConverter_t414F0BA1D7E783E6AA182523D5A665E835379C4F* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3 V_0;
	memset((&V_0), 0, sizeof(V_0));
	{
		RuntimeObject* L_0 = ___1_value;
		il2cpp_codegen_runtime_class_init_inline(Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_il2cpp_TypeInfo_var);
		Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3 L_1;
		L_1 = Timestamp_FromDateTime_mA6D496874163B0A6323C5824B291BE8091782CB0(((*(DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D*)UnBox(L_0, DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D_il2cpp_TypeInfo_var))), NULL);
		V_0 = L_1;
		TimestampProxy_t62B4D8B5017180CFD050625E52B3F07CB596BFC3* L_2;
		L_2 = Timestamp_ConvertToProxy_mFFE2890F49BC2F29631E02573F4EA3DA50DBEA96((&V_0), NULL);
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_3;
		L_3 = FieldValueProxy_Timestamp_mAAD511133BE8E83375DFA072072CACCE16EE8DE9(L_2, NULL);
		return L_3;
	}
}
// Method Definition Index: 71501
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* DateTimeConverter_DeserializeTimestamp_m1818DB588574DAFC5EA11EEE574F2CEE4354C098 (DateTimeConverter_t414F0BA1D7E783E6AA182523D5A665E835379C4F* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3 ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		il2cpp_codegen_runtime_class_init_inline(Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_il2cpp_TypeInfo_var);
		DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D L_0;
		L_0 = Timestamp_ToDateTime_mDB1ACFC2FB995894CCED239A5E557CDA12F066FE((&___1_value), NULL);
		DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D L_1 = L_0;
		RuntimeObject* L_2 = Box(DateTime_t66193957C73913903DDAD89FEDC46139BCA5802D_il2cpp_TypeInfo_var, &L_1);
		return L_2;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71502
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DateTimeOffsetConverter__ctor_m6692EC537B17F33E0C4C08260AD10F605CD152DB (DateTimeOffsetConverter_tAD4C59B3E28745F5A1E340FFE014D257CD29887F* __this, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4_0_0_0_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4_0_0_0_var) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71503
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* DateTimeOffsetConverter_Serialize_mE9E188E43CA145481167683AE727B6C5E1AC2DD9 (DateTimeOffsetConverter_tAD4C59B3E28745F5A1E340FFE014D257CD29887F* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3 V_0;
	memset((&V_0), 0, sizeof(V_0));
	{
		RuntimeObject* L_0 = ___1_value;
		il2cpp_codegen_runtime_class_init_inline(Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_il2cpp_TypeInfo_var);
		Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3 L_1;
		L_1 = Timestamp_FromDateTimeOffset_m1E55B744FDA745628378811D18B81551BA8B674E(((*(DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4*)UnBox(L_0, DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4_il2cpp_TypeInfo_var))), NULL);
		V_0 = L_1;
		TimestampProxy_t62B4D8B5017180CFD050625E52B3F07CB596BFC3* L_2;
		L_2 = Timestamp_ConvertToProxy_mFFE2890F49BC2F29631E02573F4EA3DA50DBEA96((&V_0), NULL);
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_3;
		L_3 = FieldValueProxy_Timestamp_mAAD511133BE8E83375DFA072072CACCE16EE8DE9(L_2, NULL);
		return L_3;
	}
}
// Method Definition Index: 71504
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* DateTimeOffsetConverter_DeserializeTimestamp_m0CAF92C2407C86FA8186C6C266762FE02EE436EB (DateTimeOffsetConverter_tAD4C59B3E28745F5A1E340FFE014D257CD29887F* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3 ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4_il2cpp_TypeInfo_var);
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		il2cpp_codegen_runtime_class_init_inline(Timestamp_t9C2EDAE46B1BB2C0844C483B8BC464DAEDF237C3_il2cpp_TypeInfo_var);
		DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4 L_0;
		L_0 = Timestamp_ToDateTimeOffset_mC1AB3B395A37909C8A0E01DB07C55C0E6AD3ED46((&___1_value), NULL);
		DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4 L_1 = L_0;
		RuntimeObject* L_2 = Box(DateTimeOffset_t4EE701FE2F386D6F932FAC9B11E4B74A5B30F0A4_il2cpp_TypeInfo_var, &L_1);
		return L_2;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
// Method Definition Index: 71505
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void DocumentReferenceConverter__ctor_m944C476BC390D26369F42B3ADC85A158A99F7059 (DocumentReferenceConverter_t77C4B95A6C934F7341FA4093848C74595B1926E5* __this, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&DocumentReference_t771D97F07262D859FCE27B0C344AB1E54F6FFFCF_0_0_0_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		RuntimeTypeHandle_t332A452B8B6179E4469B69525D0FE82A88030F7B L_0 = { reinterpret_cast<intptr_t> (DocumentReference_t771D97F07262D859FCE27B0C344AB1E54F6FFFCF_0_0_0_var) };
		il2cpp_codegen_runtime_class_init_inline(il2cpp_defaults.systemtype_class);
		Type_t* L_1;
		L_1 = Type_GetTypeFromHandle_m6062B81682F79A4D6DF2640692EE6D9987858C57(L_0, NULL);
		ConverterBase__ctor_m0D2AA36F632B6CAE14B9AF2F314AE5A6296790DE(__this, L_1, NULL);
		return;
	}
}
// Method Definition Index: 71506
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* DocumentReferenceConverter_Serialize_m7B8549F0E454701D2F3AD64EBEA45A7EED11697C (DocumentReferenceConverter_t77C4B95A6C934F7341FA4093848C74595B1926E5* __this, SerializationContext_tF76E37F73D99EBEE5B9896B738537415F921B19D* ___0_context, RuntimeObject* ___1_value, const RuntimeMethod* method) 
{
	static bool s_Il2CppMethodInitialized;
	if (!s_Il2CppMethodInitialized)
	{
		il2cpp_codegen_initialize_runtime_metadata((uintptr_t*)&DocumentReference_t771D97F07262D859FCE27B0C344AB1E54F6FFFCF_il2cpp_TypeInfo_var);
		s_Il2CppMethodInitialized = true;
	}
	//<source_info:<no-source>:1>
	{
		RuntimeObject* L_0 = ___1_value;
		NullCheck(((DocumentReference_t771D97F07262D859FCE27B0C344AB1E54F6FFFCF*)CastclassSealed((RuntimeObject*)L_0, DocumentReference_t771D97F07262D859FCE27B0C344AB1E54F6FFFCF_il2cpp_TypeInfo_var)));
		DocumentReferenceProxy_t2130D62C085B6D0F09E46550D38F9BD1EEBE0F7A* L_1;
		L_1 = DocumentReference_get_Proxy_m6D6CA54A228000E504062E43C39C05FA7ACC1485(((DocumentReference_t771D97F07262D859FCE27B0C344AB1E54F6FFFCF*)CastclassSealed((RuntimeObject*)L_0, DocumentReference_t771D97F07262D859FCE27B0C344AB1E54F6FFFCF_il2cpp_TypeInfo_var)), NULL);
		FieldValueProxy_t9D6AD5742313557D895018060117AB42F7419B26* L_2;
		L_2 = FieldValueProxy_Reference_mB824AA209F6327C73E4FD5752E9215AE82063743(L_1, NULL);
		return L_2;
	}
}
// Method Definition Index: 71507
IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR RuntimeObject* DocumentReferenceConverter_DeserializeReference_mEEB648CEA7BBAF559C1DA6237CEFD6517FEFBBE0 (DocumentReferenceConverter_t77C4B95A6C934F7341FA4093848C74595B1926E5* __this, DeserializationContext_tD91A57F55C84DA8F2696342811D9EC1FCCE2BE8E* ___0_context, DocumentReference_t771D97F07262D859FCE27B0C344AB1E54F6FFFCF* ___1_value, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	{
		DocumentReference_t771D97F07262D859FCE27B0C344AB1E54F6FFFCF* L_0 = ___1_value;
		return L_0;
	}
}
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
#ifdef __clang__
#pragma clang diagnostic pop
#endif
#ifdef __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-offsetof"
#pragma clang diagnostic ignored "-Wunused-variable"
#endif
#ifdef __clang__
#pragma clang diagnostic pop
#endif
// Method Definition Index: 9488
IL2CPP_MANAGED_FORCE_INLINE IL2CPP_METHOD_ATTR void List_1_Add_m0CE6E39234ED33F5195AABC8029D06D4756C75C1_gshared_inline (List_1_t6959D78D53022948E65A4FDA6291D7F38FEFA02E* __this, Il2CppSharedGenericObject* ___0_item, const RuntimeMethod* method) 
{
	//<source_info:<no-source>:1>
	__CanonU5BU5D_tFF96AE6C231BB36A6CEE54CEEB72ED8E90201979* V_0 = NULL;
	int32_t V_1 = 0;
	{
		int32_t L_0 = __this->____version;
		__this->____version = ((int32_t)il2cpp_codegen_add(L_0, 1));
		__CanonU5BU5D_tFF96AE6C231BB36A6CEE54CEEB72ED8E90201979* L_1 = __this->____items;
		V_0 = L_1;
		int32_t L_2 = __this->____size;
		V_1 = L_2;
		int32_t L_3 = V_1;
		__CanonU5BU5D_tFF96AE6C231BB36A6CEE54CEEB72ED8E90201979* L_4 = V_0;
		NullCheck(L_4);
		int32_t L_5 = (il2cpp_codegen_conv<int32_t,int64_t,int64_t,false,false>((((RuntimeArray*)L_4)->max_length),NULL));
		if ((!(((uint32_t)L_3) < ((uint32_t)L_5))))
		{
			goto IL_0034;
		}
	}
	{
		int32_t L_6 = V_1;
		__this->____size = ((int32_t)il2cpp_codegen_add(L_6, 1));
		__CanonU5BU5D_tFF96AE6C231BB36A6CEE54CEEB72ED8E90201979* L_7 = V_0;
		int32_t L_8 = V_1;
		Il2CppSharedGenericObject* L_9 = ___0_item;
		NullCheck(L_7);
		(L_7)->SetAt(static_cast<il2cpp_array_size_t>(L_8), (Il2CppSharedGenericObject*)L_9);
		return;
	}

IL_0034:
	{
		Il2CppSharedGenericObject* L_10 = ___0_item;
		List_1_AddWithResize_mCC24A812DFC30C3DE2230E3C8EE705871C1DFF81(__this, L_10, il2cpp_rgctx_method(method->klass->rgctx_data, 14));
		return;
	}
}

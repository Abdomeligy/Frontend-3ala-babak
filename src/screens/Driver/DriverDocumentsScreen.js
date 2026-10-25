
import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import {
    Ionicons,
} from '@expo/vector-icons';

import {
    driverApi,
} from '../../api/driverApi';

import {
    COLORS,
} from '../../constants/colors';

import {
    FONT_SIZES,
    SPACING,
    RADIUS,
} from '../../constants/theme';

import {
    useAuth,
} from '../../context/AuthContext';


// ============================================================
// COLORS
// ============================================================

const PRIMARY =
    COLORS?.primary ||
    '#C9A227';

const TEXT =
    COLORS?.text ||
    '#222222';

const BACKGROUND =
    COLORS?.background ||
    '#F7F7F7';


// ============================================================
// DOCUMENT TYPES
// ============================================================

const DOCUMENT_TYPES = [

    {
        key: 'national_id',
        label: 'صورة البطاقة الشخصية',
        icon: 'card-outline',
    },

    {
        key: 'driving_license',
        label: 'رخصة القيادة',
        icon: 'document-text-outline',
    },

    {
        key: 'vehicle_license',
        label: 'رخصة المركبة',
        icon: 'car-outline',
    },

    {
        key: 'insurance',
        label: 'وثيقة التأمين',
        icon: 'shield-checkmark-outline',
    },

    {
        key: 'profile_photo',
        label: 'الصورة الشخصية',
        icon: 'person-circle-outline',
    },

];


// ============================================================
// STATUS CONFIG
// ============================================================

const getStatusInfo = (status) => {

    switch (status) {

        case 'approved':

            return {
                label: 'تم الاعتماد',
                icon: 'checkmark-circle',
            };

        case 'pending':

            return {
                label: 'قيد المراجعة',
                icon: 'time-outline',
            };

        case 'rejected':

            return {
                label: 'مرفوض',
                icon: 'close-circle',
            };

        default:

            return {
                label: 'لم يتم الرفع',
                icon: 'cloud-upload-outline',
            };
    }
};


// ============================================================
// DRIVER ID RESOLVER
// ============================================================

const resolveDriverId = (
    route,
    user
) => {

    // ----------------------------------------------------------
    // ROUTE
    // ----------------------------------------------------------

    const routeDriverId =
        route?.params?.driverId ??
        route?.params?.DriverId;

    const parsedRouteDriverId =
        Number(routeDriverId);

    if (
        Number.isInteger(
            parsedRouteDriverId
        ) &&
        parsedRouteDriverId > 0
    ) {

        return parsedRouteDriverId;
    }


    // ----------------------------------------------------------
    // AUTH
    // ----------------------------------------------------------

    const userDriverId =
        user?.driverId ??
        user?.DriverId;

    const parsedUserDriverId =
        Number(userDriverId);

    if (
        Number.isInteger(
            parsedUserDriverId
        ) &&
        parsedUserDriverId > 0
    ) {

        return parsedUserDriverId;
    }


    return null;
};


// ============================================================
// SCREEN
// ============================================================

export default function DriverDocumentsScreen({
    navigation,
    route,
}) {

    // ==========================================================
    // AUTH
    // ==========================================================

    const {
        user,
    } = useAuth();


    // ==========================================================
    // DRIVER ID
    // ==========================================================

    const driverId =
        useMemo(
            () =>
                resolveDriverId(
                    route,
                    user
                ),
            [
                route?.params?.driverId,
                route?.params?.DriverId,
                user?.driverId,
                user?.DriverId,
            ]
        );


    // ==========================================================
    // DEBUG
    // ==========================================================

    useEffect(() => {

        console.log(
            '================================='
        );

        console.log(
            '📄 DRIVER DOCUMENTS SCREEN'
        );

        console.log(
            '👤 AUTH USER:',
            user
        );

        console.log(
            '🚗 ROUTE DRIVER ID:',
            route?.params?.driverId
        );

        console.log(
            '🚗 AUTH DRIVER ID:',
            user?.driverId
        );

        console.log(
            '✅ RESOLVED DRIVER ID:',
            driverId
        );

        console.log(
            '================================='
        );

    }, [
        user,
        route,
        driverId,
    ]);


    // ==========================================================
    // STATE
    // ==========================================================

    const [
        documents,
        setDocuments,
    ] = useState({});


    const [
        loading,
        setLoading,
    ] = useState(true);


    const [
        uploadingKey,
        setUploadingKey,
    ] = useState(null);


    const [
        refreshing,
        setRefreshing,
    ] = useState(false);


    // ==========================================================
    // LOAD DOCUMENTS
    // ==========================================================

    const loadDocuments =
        useCallback(
            async (
                showLoader = true
            ) => {

                if (!driverId) {

                    console.log(
                        '⚠️ Cannot load documents: driverId missing'
                    );

                    setLoading(false);

                    return;
                }


                try {

                    if (showLoader) {

                        setLoading(true);

                    }


                    console.log(
                        '📄 Loading driver documents:',
                        driverId
                    );


                    const response =
                        await driverApi.getDocuments(
                            driverId
                        );


                    console.log(
                        '📄 Driver documents response:',
                        response
                    );


                    if (
                        !response?.success
                    ) {

                        throw new Error(
                            response?.message ||
                            'تعذر جلب المستندات'
                        );
                    }


                    const docsMap = {};


                    for (
                        const doc
                        of response.documents || []
                    ) {

                        if (
                            doc?.documentType
                        ) {

                            docsMap[
                                doc.documentType
                            ] = doc;

                        }

                    }


                    setDocuments(
                        docsMap
                    );


                } catch (error) {

                    console.log(
                        '❌ Failed to load driver documents:',
                        error?.response?.data ||
                        error?.message ||
                        error
                    );


                    Alert.alert(
                        'خطأ',
                        error?.response?.data?.message ||
                        error?.message ||
                        'تعذر جلب حالة المستندات'
                    );


                } finally {

                    setLoading(false);

                    setRefreshing(false);
                }

            },
            [
                driverId,
            ]
        );


    // ==========================================================
    // INITIAL LOAD
    // ==========================================================

    useEffect(
        () => {

            loadDocuments();

        },
        [
            loadDocuments,
        ]
    );


    // ==========================================================
    // PICK AND UPLOAD IMAGE
    // ==========================================================

    const pickAndUploadImage =
        async (
            documentType
        ) => {

            if (!driverId) {

                Alert.alert(
                    'خطأ',
                    'لم يتم تحديد حساب السائق'
                );

                return;
            }


            try {

                // ==================================================
                // REQUEST PERMISSION
                // ==================================================

                const permissionResult =
                    await ImagePicker
                        .requestMediaLibraryPermissionsAsync();


                if (
                    permissionResult.status !==
                    'granted'
                ) {

                    Alert.alert(
                        'تنبيه',
                        'يلزم السماح بالوصول للصور لرفع المستندات'
                    );

                    return;
                }


                // ==================================================
                // PICK IMAGE
                // ==================================================

                console.log(
                    '🖼️ Opening image picker...'
                );


                const result =
                    await ImagePicker
                        .launchImageLibraryAsync({

                            // مهم:
                            // لا تستخدم MediaType.Images
                            // لأنها غير متوفرة في إصدار expo-image-picker الحالي

                            mediaTypes: [
                                'images',
                            ],

                            quality: 0.8,

                            allowsEditing:
                                true,

                            aspect: [
                                4,
                                3,
                            ],

                        });


                // ==================================================
                // CANCEL
                // ==================================================

                if (
                    result?.canceled ||
                    !result?.assets?.length
                ) {

                    console.log(
                        '🛑 Image selection cancelled'
                    );

                    return;
                }


                // ==================================================
                // ASSET
                // ==================================================

                const asset =
                    result.assets[0];


                if (
                    !asset?.uri
                ) {

                    Alert.alert(
                        'خطأ',
                        'تعذر قراءة الصورة'
                    );

                    return;
                }


                // ==================================================
                // PREPARE FILE DATA
                // ==================================================

                const fileName =
                    asset.fileName ||
                    `${documentType}-${Date.now()}.jpg`;

                const mimeType =
                    asset.mimeType ||
                    'image/jpeg';


                // ==================================================
                // START UPLOAD
                // ==================================================

                setUploadingKey(
                    documentType
                );


                console.log(
                    '================================='
                );

                console.log(
                    '📤 UPLOADING DRIVER DOCUMENT'
                );

                console.log(
                    '🚗 Driver ID:',
                    driverId
                );

                console.log(
                    '📄 Document Type:',
                    documentType
                );

                console.log(
                    '🖼️ Image URI:',
                    asset.uri
                );

                console.log(
                    '📁 File Name:',
                    fileName
                );

                console.log(
                    '🧾 MIME Type:',
                    mimeType
                );

                console.log(
                    '================================='
                );


                // ==================================================
                // UPLOAD
                // ==================================================

                const response =
                    await driverApi.uploadDocument(
                        driverId,
                        documentType,
                        {
                            uri:
                                asset.uri,

                            name:
                                fileName,

                            mimeType:
                                mimeType,
                        }
                    );


                console.log(
                    '📤 Upload response:',
                    response
                );


                // ==================================================
                // VALIDATE RESPONSE
                // ==================================================

                if (
                    !response?.success
                ) {

                    throw new Error(
                        response?.message ||
                        'فشل رفع المستند'
                    );
                }


                // ==================================================
                // UPDATE LOCAL UI
                // ==================================================

                setDocuments(
                    (prev) => ({

                        ...prev,

                        [documentType]: {

                            ...(prev[
                                documentType
                            ] || {}),

                            documentType,

                            uploaded:
                                true,

                            status:
                                'pending',

                            fileUrl:
                                response.fileUrl ||
                                response.document?.fileUrl ||
                                null,

                            notes:
                                null,

                        },

                    })
                );


                // ==================================================
                // SUCCESS
                // ==================================================

                Alert.alert(
                    'تم بنجاح ✅',
                    'تم رفع المستند وهو الآن قيد المراجعة'
                );


                // ==================================================
                // RELOAD
                // ==================================================

                await loadDocuments(
                    false
                );


            } catch (error) {

                console.log(
                    '❌ Error uploading driver document:',
                    error?.response?.data ||
                    error?.message ||
                    error
                );


                Alert.alert(
                    'خطأ',
                    error?.response?.data?.message ||
                    error?.message ||
                    'تعذر رفع الصورة، حاول مرة أخرى'
                );


            } finally {

                setUploadingKey(
                    null
                );
            }
        };


    // ==========================================================
    // REFRESH
    // ==========================================================

    const handleRefresh =
        async () => {

            setRefreshing(
                true
            );

            await loadDocuments(
                false
            );
        };


    // ==========================================================
    // COUNTS
    // ==========================================================

    const approvedCount =
        DOCUMENT_TYPES.filter(
            (doc) =>
                documents[
                    doc.key
                ]?.status ===
                'approved'
        ).length;


    const pendingCount =
        DOCUMENT_TYPES.filter(
            (doc) =>
                documents[
                    doc.key
                ]?.status ===
                'pending'
        ).length;


    const rejectedCount =
        DOCUMENT_TYPES.filter(
            (doc) =>
                documents[
                    doc.key
                ]?.status ===
                'rejected'
        ).length;


    const allApproved =
        approvedCount ===
        DOCUMENT_TYPES.length;


    // ==========================================================
    // NO DRIVER ID
    // ==========================================================

    if (!driverId) {

        return (

            <View
                style={
                    styles.centerContainer
                }
            >

                <Ionicons
                    name="alert-circle-outline"
                    size={64}
                    color={
                        PRIMARY
                    }
                />


                <Text
                    style={
                        styles.errorTitle
                    }
                >
                    تعذر تحديد حساب السائق
                </Text>


                <Text
                    style={
                        styles.errorText
                    }
                >
                    لم يتم العثور على رقم السائق
                    داخل بيانات الحساب.
                </Text>


                <Text
                    style={
                        styles.debugText
                    }
                >
                    User ID:{' '}
                    {
                        user?.id ??
                        user?.Id ??
                        'غير متوفر'
                    }
                </Text>


                <Text
                    style={
                        styles.debugText
                    }
                >
                    Driver ID:{' '}
                    {
                        user?.driverId ??
                        user?.DriverId ??
                        'غير متوفر'
                    }
                </Text>


                <TouchableOpacity
                    style={
                        styles.retryButton
                    }
                    onPress={() =>
                        navigation?.goBack?.()
                    }
                >

                    <Text
                        style={
                            styles.retryButtonText
                        }
                    >
                        رجوع
                    </Text>

                </TouchableOpacity>

            </View>

        );
    }


    // ==========================================================
    // LOADING
    // ==========================================================

    if (loading) {

        return (

            <View
                style={
                    styles.centerContainer
                }
            >

                <ActivityIndicator
                    size="large"
                    color={
                        PRIMARY
                    }
                />


                <Text
                    style={
                        styles.loadingText
                    }
                >
                    جاري تحميل المستندات...
                </Text>

            </View>

        );
    }


    // ==========================================================
    // RENDER
    // ==========================================================

    return (

        <View
            style={
                styles.container
            }
        >

            {/* ==================================================
                HEADER
            ================================================== */}

            <View
                style={
                    styles.header
                }
            >

                <TouchableOpacity
                    style={
                        styles.headerButton
                    }
                    onPress={() =>
                        navigation?.goBack?.()
                    }
                >

                    <Ionicons
                        name="arrow-forward"
                        size={24}
                        color={
                            TEXT
                        }
                    />

                </TouchableOpacity>


                <View
                    style={
                        styles.headerTitleContainer
                    }
                >

                    <Text
                        style={
                            styles.headerTitle
                        }
                    >
                        مستندات السائق
                    </Text>


                    <Text
                        style={
                            styles.headerSubtitle
                        }
                    >
                        ارفع المستندات المطلوبة
                    </Text>

                </View>


                <TouchableOpacity
                    style={
                        styles.headerButton
                    }
                    onPress={
                        handleRefresh
                    }
                >

                    {
                        refreshing ? (

                            <ActivityIndicator
                                size="small"
                                color={
                                    PRIMARY
                                }
                            />

                        ) : (

                            <Ionicons
                                name="refresh-outline"
                                size={23}
                                color={
                                    PRIMARY
                                }
                            />

                        )
                    }

                </TouchableOpacity>

            </View>


            <ScrollView
                contentContainerStyle={
                    styles.content
                }
                showsVerticalScrollIndicator={
                    false
                }
            >

                {/* ==================================================
                    SUMMARY
                ================================================== */}

                <View
                    style={
                        styles.summaryCard
                    }
                >

                    <View
                        style={
                            styles.summaryIcon
                        }
                    >

                        <Ionicons
                            name={
                                allApproved
                                    ? 'checkmark-circle'
                                    : 'document-text-outline'
                            }
                            size={30}
                            color={
                                PRIMARY
                            }
                        />

                    </View>


                    <View
                        style={
                            styles.summaryContent
                        }
                    >

                        <Text
                            style={
                                styles.summaryTitle
                            }
                        >
                            حالة المستندات
                        </Text>


                        <Text
                            style={
                                styles.summaryText
                            }
                        >
                            {approvedCount} من{' '}
                            {DOCUMENT_TYPES.length}{' '}
                            مستندات معتمدة
                        </Text>

                    </View>

                </View>


                {/* ==================================================
                    COUNTERS
                ================================================== */}

                <View
                    style={
                        styles.counterRow
                    }
                >

                    <View
                        style={
                            styles.counterCard
                        }
                    >

                        <Text
                            style={
                                styles.counterNumber
                            }
                        >
                            {approvedCount}
                        </Text>


                        <Text
                            style={
                                styles.counterLabel
                            }
                        >
                            معتمد
                        </Text>

                    </View>


                    <View
                        style={
                            styles.counterCard
                        }
                    >

                        <Text
                            style={
                                styles.counterNumber
                            }
                        >
                            {pendingCount}
                        </Text>


                        <Text
                            style={
                                styles.counterLabel
                            }
                        >
                            قيد المراجعة
                        </Text>

                    </View>


                    <View
                        style={
                            styles.counterCard
                        }
                    >

                        <Text
                            style={
                                styles.counterNumber
                            }
                        >
                            {rejectedCount}
                        </Text>


                        <Text
                            style={
                                styles.counterLabel
                            }
                        >
                            مرفوض
                        </Text>

                    </View>

                </View>


                {/* ==================================================
                    DRIVER INFO
                ================================================== */}

                <View
                    style={
                        styles.driverInfoCard
                    }
                >

                    <Ionicons
                        name="person-outline"
                        size={20}
                        color={
                            PRIMARY
                        }
                    />


                    <View
                        style={
                            styles.driverInfoContent
                        }
                    >

                        <Text
                            style={
                                styles.driverInfoTitle
                            }
                        >
                            حساب السائق
                        </Text>


                        <Text
                            style={
                                styles.driverInfoText
                            }
                        >
                            رقم السائق: {driverId}
                        </Text>

                    </View>

                </View>


                {/* ==================================================
                    INFO
                ================================================== */}

                <View
                    style={
                        styles.infoCard
                    }
                >

                    <Ionicons
                        name="information-circle-outline"
                        size={22}
                        color={
                            PRIMARY
                        }
                    />


                    <Text
                        style={
                            styles.infoText
                        }
                    >
                        يجب رفع جميع المستندات المطلوبة،
                        وبعد رفع كل مستند سيتم إرساله
                        للمراجعة. لا يمكنك استقبال الطلبات
                        حتى يتم اعتماد جميع المستندات.
                    </Text>

                </View>


                {/* ==================================================
                    DOCUMENTS
                ================================================== */}

                {
                    DOCUMENT_TYPES.map(
                        (document) => {

                            const current =
                                documents[
                                    document.key
                                ] || {};


                            const status =
                                current.status ||
                                'not_uploaded';


                            const statusInfo =
                                getStatusInfo(
                                    status
                                );


                            const isUploading =
                                uploadingKey ===
                                document.key;


                            return (

                                <View
                                    key={
                                        document.key
                                    }
                                    style={
                                        styles.documentCard
                                    }
                                >

                                    {/* =================================
                                        ICON
                                    ================================= */}

                                    <View
                                        style={
                                            styles.documentIcon
                                        }
                                    >

                                        <Ionicons
                                            name={
                                                document.icon
                                            }
                                            size={28}
                                            color={
                                                PRIMARY
                                            }
                                        />

                                    </View>


                                    {/* =================================
                                        CONTENT
                                    ================================= */}

                                    <View
                                        style={
                                            styles.documentContent
                                        }
                                    >

                                        <Text
                                            style={
                                                styles.documentTitle
                                            }
                                        >
                                            {
                                                document.label
                                            }
                                        </Text>


                                        <View
                                            style={
                                                styles.statusRow
                                            }
                                        >

                                            <Ionicons
                                                name={
                                                    statusInfo.icon
                                                }
                                                size={17}
                                                color={
                                                    status ===
                                                    'approved'
                                                        ? '#2E7D32'
                                                        : status ===
                                                          'rejected'
                                                            ? '#C62828'
                                                            : status ===
                                                              'pending'
                                                                ? '#F57C00'
                                                                : '#777'
                                                }
                                            />


                                            <Text
                                                style={[
                                                    styles.statusText,

                                                    status ===
                                                    'approved' &&
                                                        styles.approvedText,

                                                    status ===
                                                    'rejected' &&
                                                        styles.rejectedText,

                                                    status ===
                                                    'pending' &&
                                                        styles.pendingText,
                                                ]}
                                            >
                                                {
                                                    statusInfo.label
                                                }
                                            </Text>

                                        </View>


                                        {
                                            status ===
                                            'rejected' &&
                                            current.notes ? (

                                                <Text
                                                    style={
                                                        styles.rejectionReason
                                                    }
                                                >
                                                    سبب الرفض:{' '}
                                                    {
                                                        current.notes
                                                    }
                                                </Text>

                                            ) : null
                                        }

                                    </View>


                                    {/* =================================
                                        ACTION
                                    ================================= */}

                                    <TouchableOpacity
                                        style={[
                                            styles.uploadButton,

                                            status ===
                                            'approved' &&
                                                styles.approvedButton,

                                            status ===
                                            'pending' &&
                                                styles.pendingButton,
                                        ]}
                                        disabled={
                                            isUploading ||
                                            status ===
                                            'approved'
                                        }
                                        onPress={() =>
                                            pickAndUploadImage(
                                                document.key
                                            )
                                        }
                                    >

                                        {
                                            isUploading ? (

                                                <ActivityIndicator
                                                    size="small"
                                                    color="#FFFFFF"
                                                />

                                            ) : (

                                                <Ionicons
                                                    name={
                                                        status ===
                                                        'approved'
                                                            ? 'checkmark'
                                                            : status ===
                                                              'pending'
                                                                ? 'time-outline'
                                                                : status ===
                                                                  'rejected'
                                                                    ? 'refresh-outline'
                                                                    : 'cloud-upload-outline'
                                                    }
                                                    size={19}
                                                    color="#FFFFFF"
                                                />

                                            )
                                        }


                                        <Text
                                            style={
                                                styles.uploadButtonText
                                            }
                                        >

                                            {
                                                isUploading
                                                    ? 'جاري الرفع...'
                                                    : status ===
                                                      'approved'
                                                        ? 'معتمد'
                                                        : status ===
                                                          'pending'
                                                            ? 'قيد المراجعة'
                                                            : status ===
                                                              'rejected'
                                                                ? 'إعادة الرفع'
                                                                : 'رفع الصورة'
                                            }

                                        </Text>

                                    </TouchableOpacity>

                                </View>

                            );

                        }
                    )
                }


                {/* ==================================================
                    FINAL STATUS
                ================================================== */}

                {
                    allApproved ? (

                        <View
                            style={
                                styles.successCard
                            }
                        >

                            <Ionicons
                                name="checkmark-circle"
                                size={42}
                                color="#2E7D32"
                            />


                            <Text
                                style={
                                    styles.successTitle
                                }
                            >
                                تم اعتماد جميع المستندات
                            </Text>


                            <Text
                                style={
                                    styles.successText
                                }
                            >
                                حسابك مستوفي مستندات السائق.
                            </Text>

                        </View>

                    ) : (

                        <View
                            style={
                                styles.warningCard
                            }
                        >

                            <Ionicons
                                name="alert-circle-outline"
                                size={28}
                                color={
                                    PRIMARY
                                }
                            />


                            <Text
                                style={
                                    styles.warningText
                                }
                            >
                                يجب اعتماد جميع المستندات الخمسة
                                حتى يصبح الحساب مؤهلاً لاستقبال الطلبات.
                            </Text>

                        </View>

                    )
                }

            </ScrollView>

        </View>

    );
}


// ============================================================
// STYLES
// ============================================================

const styles =
    StyleSheet.create({

        container: {
            flex: 1,
            backgroundColor:
                BACKGROUND,
        },


        centerContainer: {
            flex: 1,
            justifyContent:
                'center',
            alignItems:
                'center',
            padding:
                SPACING?.lg ||
                24,
            backgroundColor:
                BACKGROUND,
        },


        loadingText: {
            marginTop:
                SPACING?.md ||
                12,
            fontSize:
                FONT_SIZES?.md ||
                16,
            color:
                '#666',
        },


        errorTitle: {
            marginTop:
                16,
            fontSize:
                FONT_SIZES?.lg ||
                20,
            fontWeight:
                '700',
            color:
                TEXT,
            textAlign:
                'center',
        },


        errorText: {
            marginTop:
                8,
            fontSize:
                FONT_SIZES?.md ||
                16,
            color:
                '#777',
            textAlign:
                'center',
            lineHeight:
                24,
        },


        debugText: {
            marginTop:
                6,
            fontSize:
                13,
            color:
                '#999',
            textAlign:
                'center',
        },


        retryButton: {
            marginTop:
                20,
            backgroundColor:
                PRIMARY,
            paddingHorizontal:
                28,
            paddingVertical:
                12,
            borderRadius:
                RADIUS?.md ||
                12,
        },


        retryButtonText: {
            color:
                '#FFFFFF',
            fontSize:
                FONT_SIZES?.md ||
                16,
            fontWeight:
                '700',
        },


        // ======================================================
        // HEADER
        // ======================================================

        header: {
            flexDirection:
                'row',
            alignItems:
                'center',
            paddingHorizontal:
                SPACING?.md ||
                16,
            paddingVertical:
                14,
            backgroundColor:
                '#FFFFFF',
            borderBottomWidth:
                1,
            borderBottomColor:
                '#EEEEEE',
        },


        headerButton: {
            width:
                42,
            height:
                42,
            borderRadius:
                21,
            justifyContent:
                'center',
            alignItems:
                'center',
        },


        headerTitleContainer: {
            flex: 1,
            alignItems:
                'center',
        },


        headerTitle: {
            fontSize:
                FONT_SIZES?.lg ||
                20,
            fontWeight:
                '800',
            color:
                TEXT,
        },


        headerSubtitle: {
            marginTop:
                3,
            fontSize:
                FONT_SIZES?.sm ||
                13,
            color:
                '#777',
        },


        // ======================================================
        // CONTENT
        // ======================================================

        content: {
            padding:
                SPACING?.md ||
                16,
            paddingBottom:
                40,
        },


        // ======================================================
        // SUMMARY
        // ======================================================

        summaryCard: {
            flexDirection:
                'row',
            alignItems:
                'center',
            backgroundColor:
                '#FFFFFF',
            borderRadius:
                RADIUS?.lg ||
                16,
            padding:
                16,
            marginBottom:
                12,
        },


        summaryIcon: {
            width:
                54,
            height:
                54,
            borderRadius:
                27,
            justifyContent:
                'center',
            alignItems:
                'center',
            backgroundColor:
                '#FFF8E1',
        },


        summaryContent: {
            flex: 1,
            marginLeft:
                12,
        },


        summaryTitle: {
            fontSize:
                FONT_SIZES?.lg ||
                18,
            fontWeight:
                '800',
            color:
                TEXT,
        },


        summaryText: {
            marginTop:
                4,
            fontSize:
                FONT_SIZES?.sm ||
                14,
            color:
                '#777',
        },


        // ======================================================
        // COUNTERS
        // ======================================================

        counterRow: {
            flexDirection:
                'row',
            gap:
                10,
            marginBottom:
                12,
        },


        counterCard: {
            flex: 1,
            backgroundColor:
                '#FFFFFF',
            borderRadius:
                RADIUS?.md ||
                12,
            paddingVertical:
                14,
            alignItems:
                'center',
        },


        counterNumber: {
            fontSize:
                22,
            fontWeight:
                '800',
            color:
                PRIMARY,
        },


        counterLabel: {
            marginTop:
                3,
            fontSize:
                12,
            color:
                '#777',
        },


        // ======================================================
        // DRIVER INFO
        // ======================================================

        driverInfoCard: {
            flexDirection:
                'row',
            alignItems:
                'center',
            backgroundColor:
                '#FFFFFF',
            borderRadius:
                RADIUS?.md ||
                12,
            padding:
                14,
            marginBottom:
                12,
        },


        driverInfoContent: {
            marginLeft:
                10,
        },


        driverInfoTitle: {
            fontSize:
                14,
            fontWeight:
                '800',
            color:
                TEXT,
        },


        driverInfoText: {
            marginTop:
                3,
            fontSize:
                12,
            color:
                '#777',
        },


        // ======================================================
        // INFO
        // ======================================================

        infoCard: {
            flexDirection:
                'row',
            alignItems:
                'flex-start',
            backgroundColor:
                '#FFF8E1',
            borderRadius:
                RADIUS?.md ||
                12,
            padding:
                14,
            marginBottom:
                16,
        },


        infoText: {
            flex: 1,
            marginLeft:
                10,
            fontSize:
                13,
            lineHeight:
                21,
            color:
                '#665A2E',
        },


        // ======================================================
        // DOCUMENT CARD
        // ======================================================

        documentCard: {
            flexDirection:
                'row',
            alignItems:
                'center',
            backgroundColor:
                '#FFFFFF',
            borderRadius:
                RADIUS?.lg ||
                16,
            padding:
                14,
            marginBottom:
                12,
        },


        documentIcon: {
            width:
                52,
            height:
                52,
            borderRadius:
                14,
            justifyContent:
                'center',
            alignItems:
                'center',
            backgroundColor:
                '#FFF8E1',
        },


        documentContent: {
            flex: 1,
            marginLeft:
                12,
            marginRight:
                8,
        },


        documentTitle: {
            fontSize:
                15,
            fontWeight:
                '800',
            color:
                TEXT,
        },


        statusRow: {
            flexDirection:
                'row',
            alignItems:
                'center',
            marginTop:
                6,
        },


        statusText: {
            marginLeft:
                5,
            fontSize:
                12,
            color:
                '#777',
            fontWeight:
                '600',
        },


        approvedText: {
            color:
                '#2E7D32',
        },


        pendingText: {
            color:
                '#F57C00',
        },


        rejectedText: {
            color:
                '#C62828',
        },


        rejectionReason: {
            marginTop:
                6,
            fontSize:
                11,
            lineHeight:
                17,
            color:
                '#C62828',
        },


        // ======================================================
        // UPLOAD BUTTON
        // ======================================================

        uploadButton: {
            minWidth:
                92,
            height:
                40,
            paddingHorizontal:
                10,
            borderRadius:
                10,
            backgroundColor:
                PRIMARY,
            flexDirection:
                'row',
            alignItems:
                'center',
            justifyContent:
                'center',
            gap:
                5,
        },


        pendingButton: {
            backgroundColor:
                '#F57C00',
        },


        approvedButton: {
            backgroundColor:
                '#2E7D32',
        },


        uploadButtonText: {
            color:
                '#FFFFFF',
            fontSize:
                11,
            fontWeight:
                '800',
        },


        // ======================================================
        // SUCCESS
        // ======================================================

        successCard: {
            alignItems:
                'center',
            backgroundColor:
                '#E8F5E9',
            borderRadius:
                RADIUS?.lg ||
                16,
            padding:
                22,
            marginTop:
                8,
        },


        successTitle: {
            marginTop:
                10,
            fontSize:
                18,
            fontWeight:
                '800',
            color:
                '#2E7D32',
            textAlign:
                'center',
        },


        successText: {
            marginTop:
                5,
            fontSize:
                13,
            color:
                '#4A6B4C',
            textAlign:
                'center',
        },


        // ======================================================
        // WARNING
        // ======================================================

        warningCard: {
            flexDirection:
                'row',
            alignItems:
                'center',
            backgroundColor:
                '#FFF8E1',
            borderRadius:
                RADIUS?.lg ||
                16,
            padding:
                16,
            marginTop:
                8,
        },


        warningText: {
            flex: 1,
            marginLeft:
                10,
            fontSize:
                13,
            lineHeight:
                20,
            color:
                '#665A2E',
        },

    });


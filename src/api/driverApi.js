import axiosClient from './axiosClient';


// ============================================================
// HELPERS
// ============================================================

const requireDriverId = (
    driverId
) => {

    const parsed =
        Number(driverId);

    if (
        !Number.isInteger(parsed) ||
        parsed <= 0
    ) {

        throw new Error(
            'driverId غير صالح'
        );
    }

    return parsed;
};


// ============================================================
// DRIVER API
// ============================================================

export const driverApi = {

    // ==========================================================
    // ADD DRIVER
    // ==========================================================

    addDriver: async (
        userId,
        vehicleType
    ) => {

        const res =
            await axiosClient.post(
                '/drivers/add',
                {
                    userId,
                    vehicleType,
                }
            );

        return res.data;
    },


    // ==========================================================
    // GET DRIVER PROFILE
    // ==========================================================

    getProfile: async (
        driverId
    ) => {

        const validDriverId =
            requireDriverId(
                driverId
            );

        const res =
            await axiosClient.get(
                `/drivers/${validDriverId}`
            );

        return res.data;
    },


    // ==========================================================
    // UPDATE DRIVER STATUS
    // ==========================================================

    updateStatus: async (
        driverId,
        status
    ) => {

        const validDriverId =
            requireDriverId(
                driverId
            );

        if (!status) {
            throw new Error(
                'status مطلوب'
            );
        }

        const res =
            await axiosClient.put(
                `/drivers/${validDriverId}/status`,
                {
                    status,
                }
            );

        return res.data;
    },

// ==========================================================
// UPDATE DRIVER LOCATION
// ==========================================================

updateLocation: async (
    driverId,
    latitude,
    longitude
) => {

    const validDriverId =
        requireDriverId(
            driverId
        );

    const lat =
        Number(latitude);

    const lng =
        Number(longitude);


    // ======================================================
    // VALIDATE COORDINATES
    // ======================================================

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
    ) {

        throw new Error(
            'إحداثيات الموقع غير صالحة'
        );
    }


    if (
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
    ) {

        throw new Error(
            'إحداثيات الموقع خارج النطاق الصحيح'
        );
    }


    if (
        lat === 0 &&
        lng === 0
    ) {

        throw new Error(
            'إحداثيات الموقع غير صالحة'
        );
    }


    // ======================================================
    // SEND LOCATION
    //
    // Backend expects:
    // lat
    // lng
    // ======================================================

    const res =
        await axiosClient.put(
            `/drivers/${validDriverId}/location`,
            {
                lat,
                lng,
            }
        );


    return res.data;
},
    // ==========================================================
    // GET EARNINGS
    // ==========================================================

    getEarnings: async (
        driverId
    ) => {

        const validDriverId =
            requireDriverId(
                driverId
            );

        const res =
            await axiosClient.get(
                `/drivers/${validDriverId}/earnings`
            );

        return res.data;
    },


    // ==========================================================
    // GET DRIVER DOCUMENTS
    //
    // GET /api/driver-documents/:driverId
    // ==========================================================

    getDocuments: async (
        driverId
    ) => {

        const validDriverId =
            requireDriverId(
                driverId
            );


        const res =
            await axiosClient.get(
                `/driver-documents/${validDriverId}`
            );


        return res.data;
    },


    // ==========================================================
    // UPLOAD DRIVER DOCUMENT IMAGE
    //
    // POST /api/driver-documents
    //
    // multipart/form-data
    //
    // image
    // driverId
    // documentType
    //
    // ==========================================================

    uploadDocument: async (
        driverId,
        documentType,
        image
    ) => {

        const validDriverId =
            requireDriverId(
                driverId
            );


        if (
            !documentType ||
            !String(documentType).trim()
        ) {

            throw new Error(
                'documentType مطلوب'
            );
        }


        if (!image) {

            throw new Error(
                'الصورة مطلوبة'
            );
        }


        const formData =
            new FormData();


        // ======================================================
        // IMAGE
        // ======================================================

        formData.append(
            'image',
            {
                uri:
                    image.uri,

                name:
                    image.name ||
                    `driver-document-${Date.now()}.jpg`,

                type:
                    image.mimeType ||
                    image.type ||
                    'image/jpeg',
            }
        );


        // ======================================================
        // DRIVER ID
        // ======================================================

        formData.append(
            'driverId',
            String(
                validDriverId
            )
        );


        // ======================================================
        // DOCUMENT TYPE
        // ======================================================

        formData.append(
            'documentType',
            String(
                documentType
            ).trim()
        );


        // ======================================================
        // SEND
        // ======================================================
        //
        // مهم:
        // لا نضع Content-Type يدويًا.
        //
        // Axios / React Native سيضع
        // multipart boundary تلقائيًا.
        // ======================================================

        const res =
            await axiosClient.post(
                '/driver-documents',
                formData
            );


        return res.data;
    },


    // ==========================================================
    // REVIEW DOCUMENT
    //
    // ADMIN ONLY
    // ==========================================================

    reviewDocument: async (
        documentId,
        status,
        notes = null
    ) => {

        const parsedDocumentId =
            Number(documentId);


        if (
            !Number.isInteger(
                parsedDocumentId
            ) ||
            parsedDocumentId <= 0
        ) {

            throw new Error(
                'documentId غير صالح'
            );
        }


        if (
            ![
                'approved',
                'rejected',
            ].includes(status)
        ) {

            throw new Error(
                'حالة المستند غير صالحة'
            );
        }


        const res =
            await axiosClient.put(
                `/driver-documents/${parsedDocumentId}/review`,
                {
                    status,
                    notes,
                }
            );


        return res.data;
    },
};
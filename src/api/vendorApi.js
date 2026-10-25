import axiosClient from './axiosClient';

/*
|--------------------------------------------------------------------------
| VENDOR API
|--------------------------------------------------------------------------
|
| Backend Base:
|   /api
|
| Vendor:
|   /api/vendor/*
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const isFormDataPayload = (payload) => {
    if (!payload) {
        return false;
    }

    if (
        typeof FormData !== 'undefined' &&
        payload instanceof FormData
    ) {
        return true;
    }

    return false;
};


const getMultipartConfig = (payload) => {

    if (!isFormDataPayload(payload)) {
        return {};
    }

    return {
        headers: {
            Accept: 'application/json',
        },
    };
};


/*
|--------------------------------------------------------------------------
| VENDOR API
|--------------------------------------------------------------------------
*/

const vendorApi = {

    // =========================================================
    // CUSTOMER FACING
    // =========================================================

    getVendors: (params = {}) =>
        axiosClient.get(
            '/restaurants',
            {
                params,
            }
        ),


    getVendorById: (id) =>
        axiosClient.get(
            `/restaurants/${id}`
        ),


    getRestaurantMenu: (restaurantId) =>
        axiosClient.get(
            `/menu/restaurant/${restaurantId}`
        ),


    // =========================================================
    // MY STORE
    // =========================================================

    getMyStore: () =>
        axiosClient.get(
            '/vendor/restaurant'
        ),


    getMyStoreById: (restaurantId) =>
        axiosClient.get(
            `/vendor/restaurant/${restaurantId}`
        ),


    createMyStore: (payload) =>
        axiosClient.post(
            '/vendor/restaurant',
            payload,
            getMultipartConfig(payload)
        ),


    updateMyStore: (payload) =>
        axiosClient.put(
            '/vendor/restaurant',
            payload,
            getMultipartConfig(payload)
        ),


    updateStoreStatus: (isOpen) => {

        const payload =
            typeof isOpen === 'object'
                ? isOpen
                : {
                    isOpen: Boolean(isOpen),
                };

        return axiosClient.patch(
            '/vendor/restaurant/status',
            payload
        );
    },


    toggleStoreStatus: (isOpen) => {

        const payload =
            typeof isOpen === 'object'
                ? isOpen
                : {
                    isOpen: Boolean(isOpen),
                };

        return axiosClient.patch(
            '/vendor/restaurant/status',
            payload
        );
    },


    // =========================================================
    // DASHBOARD
    // =========================================================

    getDashboardStats: () =>
        axiosClient.get(
            '/vendor/dashboard'
        ),


    getStats: () =>
        axiosClient.get(
            '/vendor/dashboard'
        ),


    // =========================================================
    // ORDERS
    // =========================================================

    getOrders: (
        status = null,
        page = 1,
        limit = 15
    ) => {

        const params = {
            page,
            limit,
        };

        if (status) {
            params.status = status;
        }

        return axiosClient.get(
            '/vendor/orders',
            {
                params,
            }
        );
    },


    getOrderById: (orderId) =>
        axiosClient.get(
            `/vendor/orders/${orderId}`
        ),


    /*
     * مهم:
     *
     * المطعم لا يقوم بحذف الطلب.
     *
     * لو عندك حذف إداري للطلبات،
     * يفضل يكون من Admin API وليس Vendor API.
     */
    deleteOrder: (orderId) =>
        axiosClient.delete(
            `/vendor/orders/${orderId}`
        ),


    /*
     |--------------------------------------------------------------------------
     | UPDATE ORDER STATUS - VENDOR
     |--------------------------------------------------------------------------
     */

    updateOrderStatus: (
        orderId,
        status
    ) => {
const allowedStatuses = [
    'restaurant_accepted',
    'preparing',
    'ready_for_pickup',
];

        if (!allowedStatuses.includes(status)) {

            return Promise.reject(
                new Error(
                    'المطعم غير مسموح له بتغيير الطلب إلى هذه الحالة'
                )
            );
        }

        return axiosClient.patch(
            `/vendor/orders/${orderId}/status`,
            {
                status,
            }
        );
    },


    /*
     |--------------------------------------------------------------------------
     | START PREPARING
     |--------------------------------------------------------------------------
     */

    startPreparing: (orderId) =>
        vendorApi.updateOrderStatus(
            orderId,
            'preparing'
        ),


    /*
     |--------------------------------------------------------------------------
     | MARK READY
     |--------------------------------------------------------------------------
     */

    markReadyForPickup: (orderId) =>
        vendorApi.updateOrderStatus(
            orderId,
            'ready_for_pickup'
        ),


    // =========================================================
    // MENU / PRODUCTS
    // =========================================================

    getMyMenu: () =>
        axiosClient.get(
            '/vendor/menu'
        ),


    getMenuItem: (itemId) =>
        axiosClient.get(
            `/vendor/menu/${itemId}`
        ),


    // =========================================================
    // CREATE PRODUCT
    // =========================================================

    addProduct: (payload) => {

        console.log(
            '📦 vendorApi.addProduct',
            {
                isFormData:
                    isFormDataPayload(payload),
            }
        );

        return axiosClient.post(
            '/vendor/menu',
            payload,
            getMultipartConfig(payload)
        );
    },


    createProduct: (payload) => {

        console.log(
            '📦 vendorApi.createProduct',
            {
                isFormData:
                    isFormDataPayload(payload),
            }
        );

        return axiosClient.post(
            '/vendor/menu',
            payload,
            getMultipartConfig(payload)
        );
    },


    // =========================================================
    // UPDATE PRODUCT
    // =========================================================

    updateProduct: (
        productId,
        payload
    ) => {

        console.log(
            '📦 vendorApi.updateProduct',
            {
                productId,
                isFormData:
                    isFormDataPayload(payload),
            }
        );

        return axiosClient.put(
            `/vendor/menu/${productId}`,
            payload,
            getMultipartConfig(payload)
        );
    },


    // =========================================================
    // UPDATE PRODUCT IMAGE ONLY
    // =========================================================

    updateProductImage: (
        productId,
        image
    ) => {

        const formData =
            new FormData();

        if (image) {

            formData.append(
                'image',
                image
            );
        }

        console.log(
            '🖼️ vendorApi.updateProductImage',
            {
                productId,
                hasImage:
                    Boolean(image),
            }
        );

        return axiosClient.put(
            `/vendor/menu/${productId}`,
            formData,
            getMultipartConfig(formData)
        );
    },


    // =========================================================
    // DELETE PRODUCT
    // =========================================================

    deleteProduct: (productId) =>
        axiosClient.delete(
            `/vendor/menu/${productId}`
        ),


    // =========================================================
    // DELETE ACCOUNT
    // =========================================================

    deleteAccount: () =>
        axiosClient.delete(
            '/account'
        ),


    // =========================================================
    // TOGGLE PRODUCT AVAILABILITY
    // =========================================================

    toggleProductAvailability: (
        productId,
        isAvailable
    ) => {

        const payload =
            typeof isAvailable === 'object'
                ? isAvailable
                : {
                    isAvailable:
                        Boolean(isAvailable),
                };

        return axiosClient.patch(
            `/vendor/menu/${productId}/availability`,
            payload
        );
    },


    // =========================================================
    // DYNAMIC EXCEL TEMPLATE
    // =========================================================

    getExcelTemplate: () =>
        axiosClient.get(
            '/vendor/excel-template'
        ),


    getExcelTemplateHeaders: () =>
        axiosClient.get(
            '/vendor/excel-template/headers'
        ),


    getExcelHeaders: () =>
        axiosClient.get(
            '/vendor/excel-template/headers'
        ),


    downloadExcelTemplate: () =>
        axiosClient.get(
            '/vendor/excel-template/download',
            {
                responseType: 'blob',
            }
        ),


    // =========================================================
    // DYNAMIC EXCEL IMPORT
    // =========================================================

    importExcel: (formData) =>
        axiosClient.post(
            '/vendor/import-excel',
            formData,
            getMultipartConfig(formData)
        ),


    previewExcel: (formData) =>
        axiosClient.post(
            '/vendor/import-excel/preview',
            formData,
            getMultipartConfig(formData)
        ),


    previewImport: (formData) =>
        axiosClient.post(
            '/vendor/import-excel/preview',
            formData,
            getMultipartConfig(formData)
        ),


    // =========================================================
    // REVIEWS
    // =========================================================

    getStoreReviews: () =>
        axiosClient.get(
            '/vendor/reviews'
        ),
};


// ============================================================
// EXPORT
// ============================================================

export {
    vendorApi,
};

export default vendorApi;
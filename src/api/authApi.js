import axiosClient from './axiosClient';

export const authApi = {

    // ============================================================
    // LOGIN
    // ============================================================

    login(identifierOrEmail, password) {
        const payload =
            typeof identifierOrEmail === 'object'
                ? identifierOrEmail
                : {
                    login: identifierOrEmail,
                    password,
                };

        return axiosClient.post(
            '/auth/login',
            payload
        );
    },

    // ============================================================
    // REGISTER
    // ============================================================

    register(payload) {
        return axiosClient.post(
            '/auth/register',
            payload
        );
    },

    // ============================================================
    // SEND OTP
    // ============================================================

    sendOtp(emailOrPayload, type = 'register') {
        const payload =
            typeof emailOrPayload === 'object'
                ? {
                    ...emailOrPayload,
                }
                : {
                    email: emailOrPayload,
                    type,
                };

        return axiosClient.post(
            '/auth/send-otp',
            payload
        );
    },

    // ============================================================
    // VERIFY OTP
    // ============================================================

    verifyOtp(
        emailOrPayload,
        otp,
        type = 'register'
    ) {
        const payload =
            typeof emailOrPayload === 'object'
                ? {
                    ...emailOrPayload,
                }
                : {
                    email: emailOrPayload,
                    otp,
                    type,
                };

        return axiosClient.post(
            '/auth/verify-otp',
            payload
        );
    },

    // ============================================================
    // RESEND OTP
    // ============================================================

    resendOtp(
        emailOrPayload,
        type = 'register'
    ) {
        const payload =
            typeof emailOrPayload === 'object'
                ? {
                    ...emailOrPayload,
                }
                : {
                    email: emailOrPayload,
                    type,
                };

        return axiosClient.post(
            '/auth/resend-otp',
            payload
        );
    },

    // ============================================================
    // FORGOT PASSWORD
    // ============================================================

    forgotPassword(emailOrPayload) {
        const payload =
            typeof emailOrPayload === 'object'
                ? {
                    ...emailOrPayload,
                }
                : {
                    email: emailOrPayload,
                };

        return axiosClient.post(
            '/auth/forgot-password',
            payload
        );
    },

    // ============================================================
    // RESET PASSWORD
    // ============================================================

    resetPassword(
        tokenOrPayload,
        password
    ) {
        const payload =
            typeof tokenOrPayload === 'object'
                ? {
                    ...tokenOrPayload,
                }
                : {
                    token: tokenOrPayload,
                    password,
                };

        return axiosClient.post(
            '/auth/reset-password',
            payload
        );
    },

    // ============================================================
    // REFRESH TOKEN
    // ============================================================

    refreshToken(refreshTokenOrPayload) {
        const payload =
            typeof refreshTokenOrPayload === 'object'
                ? {
                    ...refreshTokenOrPayload,
                }
                : {
                    refreshToken: refreshTokenOrPayload,
                };

        return axiosClient.post(
            '/auth/refresh-token',
            payload
        );
    },

    // ============================================================
    // PROFILE
    // ============================================================

    getProfile() {
        return axiosClient.get(
            '/auth/profile'
        );
    },

    updateProfile(payload) {
        return axiosClient.put(
            '/auth/profile',
            payload
        );
    },

    // ============================================================
    // ME
    // ============================================================

    getMe() {
        return axiosClient.get(
            '/auth/me'
        );
    },

    // ============================================================
    // CHANGE PASSWORD
    // ============================================================

    changePassword(
        oldPasswordOrPayload,
        newPassword
    ) {
        const payload =
            typeof oldPasswordOrPayload === 'object'
                ? {
                    ...oldPasswordOrPayload,
                }
                : {
                    oldPassword:
                        oldPasswordOrPayload,
                    newPassword,
                };

        return axiosClient.post(
            '/auth/change-password',
            payload
        );
    },

    // ============================================================
    // LOGOUT
    // ============================================================

    logout() {
        return axiosClient.post(
            '/auth/logout'
        );
    },

    // ============================================================
    // LOGOUT ALL DEVICES
    // ============================================================

    logoutAllDevices() {
        return axiosClient.post(
            '/auth/logout-all-devices'
        );
    },

    // ============================================================
    // DELETE ACCOUNT
    // ============================================================

    deleteAccount() {
        return axiosClient.delete(
            '/auth/delete-account'
        );
    },

    // ============================================================
    // VERIFY EMAIL
    // ============================================================

    verifyEmail(tokenOrPayload) {
        const payload =
            typeof tokenOrPayload === 'object'
                ? {
                    ...tokenOrPayload,
                }
                : {
                    token: tokenOrPayload,
                };

        return axiosClient.post(
            '/auth/verify-email',
            payload
        );
    },

    // ============================================================
    // RESEND EMAIL VERIFICATION
    // ============================================================

    resendVerification(emailOrPayload) {
        const payload =
            typeof emailOrPayload === 'object'
                ? {
                    ...emailOrPayload,
                }
                : {
                    email: emailOrPayload,
                };

        return axiosClient.post(
            '/auth/resend-verification',
            payload
        );
    },

    // ============================================================
    // SESSIONS
    // ============================================================

    getSessions() {
        return axiosClient.get(
            '/auth/sessions'
        );
    },

    deleteSession(id) {
        return axiosClient.delete(
            `/auth/session/${id}`
        );
    },

    refreshSession() {
        return axiosClient.post(
            '/auth/refresh-session'
        );
    },
};

export default authApi;
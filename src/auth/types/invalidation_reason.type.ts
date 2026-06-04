export enum SessionInvalidationReason {
    LOGOUT = 'logout',
    ADMIN_LOGOUT = 'admin_logout',
    PASSWORD_CHANGE = 'password_change',
    SECURITY_EVENT = 'security_event',
    RE_LOGIN = 're_login'
}
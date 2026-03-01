const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;

function getCookieOptions() {
    const isProd = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
    };
}

export function setAuthCookies(res, accessToken, refreshToken) {
    const opts = getCookieOptions();

    res.cookie("accessToken", accessToken, {
        ...opts,
        maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    res.cookie("refreshToken", refreshToken, {
        ...opts,
        maxAge: REFRESH_TOKEN_MAX_AGE,
    });
}

export function clearAuthCookies(res) {
    const opts = getCookieOptions();
    res.clearCookie("accessToken", opts);
    res.clearCookie("refreshToken", opts);
}

interface ApiErrorData {
    statusCode: number;
    data: null;
    success: boolean;
    errors: string[];
}

class ApiError extends Error {
    statusCode: number;
    data: null;
    success: boolean;
    errors: string[];

    constructor(
        statusCode: number = 500, // Default status code is 500
        message: string = 'Something went wrong',
        errors: string[] = [],
        stack: string | undefined = undefined // Corrected 'statck' to 'stack'
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.success = false;
        this.errors = errors;
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError, ApiErrorData };

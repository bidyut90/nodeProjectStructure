export class ApiResponse<T> {
    statusCode: number;
    data: T;
    message: string;
    sucesses: boolean

    constructor(statusCode: number, data: T, message: string = "success") {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.sucesses = statusCode < 400
    }
}


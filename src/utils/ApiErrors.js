class APIError extends Error {
    constructor(
        statuscode,
        message = "Internal Server Error",
        error = [],
        stack = ""

    ){
        super(message)
        this.statuscode = statuscode
        this.message = message
        this.error = error

        if(stack){
            this.stack = stack
        }else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}
export {APIError}
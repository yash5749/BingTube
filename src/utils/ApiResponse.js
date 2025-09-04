class APIResponse {
    constructor(
        statuscode,
        data,
        message = "Success",
    ){
        this.statuscode = statuscode
        this.data = data
        this.message = message
    }
}
export {APIResponse}
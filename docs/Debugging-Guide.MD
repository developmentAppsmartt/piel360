# Debugging Guide

1. **Invalid TaskId Error**
**Why:** You’ll receive an InvalidTaskId error if you attempt to check the status of a task that has timed out. Therefore, once an AI task is initiated, you’ll need to poll for its status within the polling_interval until the status changes to either success or error.
**Solution:** To avoid the task becoming invalid, it’s necessary to implement a timed loop that queries the task status at regular intervals within the allowed polling window.
2. **404 Not Found error when using AI APIs**
**A:** ***Important***: Simply calling the File API does not upload your file. You must manually upload the file to the URL provided in the File API response. That URL is your upload destination, make sure the file is successfully transferred there before proceeding.
Before calling the AI API, ensure your file has been successfully uploaded. Use the File API to retrieve an upload URL, then upload your file to that location. Once the upload is complete, you'll receive a ***file_id*** in the response, this ID is what you'll use to access AI features related to that file.
3. **The API response returns the same style ID on the Postman**
**A:** The is because Postman (Pretty view) and Chrome use JavaScript to parse JSON responses. In JavaScript, numbers larger than 9007199254740991 (2^53-1) cannot be represented precisely. They are rounded to the nearest representable value, which makes different IDs appear identical (e.g., 219691778809271815 → 219691778809271800).
  * Precision Loss in JavaScript/JSON Error Handling
    * Cause: JavaScript's Number type cannot safely handle integers beyond 2^53 - 1, leading to silent truncation or rounding.
    * Solution: Use a JSON parser like ***json-bigint*** to treat IDs as strings and retain full precision.
4. **Beard Authentication 400 Error**
**A:** When using the V2 API, you must include your API key in every request by adding a Bearer authorization header. Failure to do so will result in authentication errors.
**Valid Request Header Format**

```
Authorization: Bearer YOUR_API_KEY
```
**Common Issues**
  1. **Missing Bearer Prefix**
The `Authorization` header must start with `Bearer` followed by the API key.
Example:

```
Authorization: YOUR_API_KEY
```
  2. **Unnecessary Characters**
Do not include angle brackets `<` or `>` around the API key. These characters are not required and will cause the request to fail.
Example:

```
Authorization: Bearer <YOUR_API_KEY>
```
  3. **Incorrect API Key**
Ensure that the API key provided in the `Authorization` header is correct and active.
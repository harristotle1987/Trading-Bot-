const crypto = require('crypto');
function generateSignature(apiSecret, timestamp, recvWindow, paramsStr) {
    return crypto.createHmac('sha256', apiSecret).update(timestamp + '5000' + recvWindow + paramsStr).digest('hex');
}

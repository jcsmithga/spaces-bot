require('dotenv').config()
const request = require('request')

const getToken = (url, callback) => {

    const options = {
        url:process.env.GET_TOKEN,
        json: true,
        body: {
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: 'client_credentials'
        }
    };

    request.post(options, (err,res,body) => {
        if (err){
            return console.log(err);
        }
        console.log("Status:  ${res.statusCode}");
        console.log(body)

        callback(res)
    });
};

var AT = '';
getToken(process.env.GET_TOKEN, (res) => {
    AT = res.body.access_token;
    return AT;
})


const sendMessage = (broadcaster_id, sender_id, message, reply_parent_message_id) => {
    
    const mesOptions = {

    }
}
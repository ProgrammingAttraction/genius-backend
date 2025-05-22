const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Adminschema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    is_active:{
      type: String,
       default:"inactive"
    },
    role:{
        type:String,
        default:"admin"
    },
},{timestamps:true});

const Adminmodel = mongoose.model('Admin', Adminschema);
module.exports = Adminmodel;
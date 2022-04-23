var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

//mongoose.connect(process.env.DB, { useNewUrlParser: true });
try {
    mongoose.connect( process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log("connected"));
}catch (error) {
    console.log("could not connect");
}
mongoose.set('useCreateIndex', true);

//reviews schema
let ReviewSchema = new Schema({
    title: {type: String, required: true, index: { unique: true}},
    review: [{reviewerName: String, review: String, rating: String}]
});


//return the model to server
module.exports = mongoose.model('Review', ReviewSchema);
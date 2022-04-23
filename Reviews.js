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
    title: {type: String, required: true},
    // review: {reviewerName: String, review: String, rating: String}
    reviewerName: {type: String, required: true},
    review: {type: String, required: true},
    rating: {type: String, required: true}
});


//return the model to server
module.exports = mongoose.model('Review', ReviewSchema);
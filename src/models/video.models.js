import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    videoFile :{
        type: String,
        required: true,
    },
    thumbnail :{
        type: String,
        required: true
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    title:{
        type: String,
        required: true
    },
    descrpition:{
        type: String,
        required: true,
        maxLength: 2000,
    },
    duration:{
        type: Number,
        required: true,
    },
    views:{ 
        type: Number,
        default: 0,
    },
    isPunlished:{
        type: Boolean,
        default: true
    }

}, {timestamps: true});

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);



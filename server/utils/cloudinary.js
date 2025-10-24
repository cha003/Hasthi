// server/utils/cloudinary.js
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadBuffer(buffer, { folder, public_id }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id,
        resource_type: "auto", // handles images and pdf (raw)
        overwrite: true,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

function destroyByPublicId(publicId, resourceType = "image") {
  // resourceType: 'image' | 'raw' | 'video'
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = { cloudinary, uploadBuffer, destroyByPublicId };

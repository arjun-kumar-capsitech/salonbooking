using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SalonBackend.Models
{
    public class Time
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } =  string.Empty;

        [BsonElement("Day")]
        public string Day { get; set; } =  string.Empty;

        [BsonElement("Opening")]
        public string Opening { get; set; } = string.Empty;

        [BsonElement("Closing")]
        public string Closing { get; set; } = string.Empty;

        [BsonElement("IsOpen")]
        public bool IsOpen { get; set; }

        [BsonElement("UserId")]
        public string UserId { get; set; } = string.Empty;

        [BsonElement("SalonName")]
        public string SalonName { get; set; } = string.Empty;
    }
}
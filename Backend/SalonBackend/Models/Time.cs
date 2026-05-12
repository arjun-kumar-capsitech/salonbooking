using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SalonBackend.Models
{
    public class TimeModel
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = "";

        public string Day { get; set; } = "";

        public string Opening { get; set; } = "";

        public string Closing { get; set; } = "";

        public bool IsOpen { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
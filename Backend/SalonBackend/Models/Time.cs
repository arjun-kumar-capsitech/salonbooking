using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace SalonBackend.Models
{
    public class Time
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;
        [BsonRequired]
        public string Day { get; set; } = string.Empty;
        public string Opening { get; set; } = string.Empty;
        public string Closing { get; set; } = string.Empty;
        public bool IsOpen { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
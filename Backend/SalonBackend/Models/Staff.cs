    using MongoDB.Bson;
    using MongoDB.Bson.Serialization.Attributes;
    using System.Text.RegularExpressions;

    namespace SalonBackend.Models
    {
        public class Staff
        {
            [BsonId]
            [BsonRepresentation(BsonType.ObjectId)]
            public string Id { get; set; } = string.Empty;

            private string _name = string.Empty;
            [BsonRequired]
            public string Name
            {
                get => _name;       
                set => _name = string.IsNullOrWhiteSpace(value)
                    ? string.Empty
                    : Regex.Replace(value, @"\s+", " ").Trim();
            }

            private string _email = string.Empty;
            [BsonRequired]
            public string Email
            {
                get => _email;
                set => _email = string.IsNullOrWhiteSpace(value)
                    ? string.Empty
                    : Regex.Replace(value, @"\s+", " ").Trim();
            }

            private string _role = string.Empty;
            public string Role
            {
                get => _role;
                set => _role = string.IsNullOrWhiteSpace(value)
                    ? string.Empty
                    : Regex.Replace(value, @"\s+", " ").Trim();
            }

            private string _Password = string.Empty;
            public string Password
            {
                get => _Password;
                set => _Password = string.IsNullOrWhiteSpace(value)
                    ? string.Empty
                    : Regex.Replace(value, @"\s+", " ").Trim();
            }

            public bool IsActive { get; set; } = true;

        public DateTime JoinedDate { get; set; } = DateTime.UtcNow;
        public string SalonName { get; set; } = string.Empty;
        public string? PhoneNumber { get; internal set; }
    }
    }
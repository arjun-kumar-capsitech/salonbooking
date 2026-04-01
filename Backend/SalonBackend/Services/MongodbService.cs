using MongoDB.Driver;

namespace WebMOngodb.APIServices
{
    public class MongodbServices
    {
        public IMongoDatabase Database { get; }

        public MongodbServices(IConfiguration configuration)
        {
            var connectionString = configuration["MongoDB:ConnectionString"];
            var databaseName = configuration["MongoDB:DatabaseName"];

            if (string.IsNullOrEmpty(connectionString))
                throw new Exception("MongoDB connection string is missing!");

            if (string.IsNullOrEmpty(databaseName))
                throw new Exception("MongoDB database name is missing!");

            var client = new MongoClient(connectionString);
            Database = client.GetDatabase(databaseName);
        }
    }
}

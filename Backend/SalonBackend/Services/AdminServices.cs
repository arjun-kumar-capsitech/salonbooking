using MongoDB.Driver;
using SalonBackend.Models;

namespace SalonBackend.Services
{
    public class AdminService
    {
        private readonly IMongoCollection<AdminServices> _collection;

        public AdminService(IMongoDatabase database)
        {
            _collection = database.GetCollection<AdminServices>("AdminServices");
        }

        public async Task<List<AdminServices>> GetAllAsync() =>
            await _collection.Find(_ => true).ToListAsync();

        public async Task<List<AdminServices>> GetBySalonNameAsync(string salonName) =>
            await _collection.Find(x => x.SalonName == salonName).ToListAsync();

        public async Task<List<AdminServices>> GetActiveBySalonNameAsync(string salonName) =>
            await _collection.Find(x => x.SalonName == salonName && x.IsActive == true).ToListAsync();

        public async Task<AdminServices?> GetByIdAsync(string id) =>
            await _collection.Find(x => x.Id == id).FirstOrDefaultAsync();

        public async Task<AdminServices> CreateAsync(AdminServices service)
        {
            await _collection.InsertOneAsync(service);
            return service;
        }

        public async Task<bool> UpdateAsync(string id, AdminServices service)
        {
            var result = await _collection.ReplaceOneAsync(x => x.Id == id, service);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> DeleteAsync(string id)
        {
            var result = await _collection.DeleteOneAsync(x => x.Id == id);
            return result.DeletedCount > 0;
        }
    }
}
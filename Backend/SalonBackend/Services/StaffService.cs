using MongoDB.Driver;
using MongoDB.Bson;
using SalonBackend.Models;

namespace SalonBackend.Services
{
    public class StaffService
    {
        private readonly IMongoCollection<Staff> _staff;
        public StaffService(IMongoDatabase database)
        {
            _staff = database.GetCollection<Staff>("Staff");
        }

        public async Task<List<Staff>> GetAllAsync()
        {
            return await _staff.Find(_ => true).ToListAsync();
        }

        public async Task<Staff?> GetByIdAsync(string id)
        {
            if (!ObjectId.TryParse(id, out var objectId))
                return null;

            return await _staff.Find(s => s.Id == id).FirstOrDefaultAsync();
        }

        public async Task<Staff> CreateAsync(Staff staff)
        {
            await _staff.InsertOneAsync(staff);
            return staff;
        }

        public async Task<bool> UpdateAsync(string id, Staff updated)
        {
            if (!ObjectId.TryParse(id, out var objectId))
                return false;

            var result = await _staff.ReplaceOneAsync(s => s.Id == id, updated);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> DeleteAsync(string id)
        {
            if (!ObjectId.TryParse(id, out var objectId))
                return false;

            var result = await _staff.DeleteOneAsync(s => s.Id == id);
            return result.DeletedCount > 0;
        }
    }
}
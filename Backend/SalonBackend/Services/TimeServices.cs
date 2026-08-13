using MongoDB.Driver;
using SalonBackend.Models;
using SalonBackend.Models.Dtos;

namespace SalonBackend.Services
{
    public class TimeService
    {
        private readonly IMongoCollection<Time> _timeCollection;

        public TimeService(IMongoDatabase database)
        {
            _timeCollection = database.GetCollection<Time>("TimeSlots");
        }

        public async Task<List<Time>> GetAllAsync()
        {
            return await _timeCollection.Find(_ => true).ToListAsync();
        }

        public async Task<List<Time>> GetByUserIdAsync(string userId)
        {
            return await _timeCollection.Find(t => t.UserId == userId).ToListAsync();
        }

        public async Task<Time?> GetByDayAsync(string day)
        {
            return await _timeCollection.Find(t => t.Day == day).FirstOrDefaultAsync();
        }

        public async Task<Time?> GetByUserIdAndDayAsync(string userId, string day)
        {
            return await _timeCollection.Find(t => t.UserId == userId && t.Day == day).FirstOrDefaultAsync();
        }

        public async Task<Time> CreateOrUpdateAsync(TimeDto dto)
        {
            var existing = await _timeCollection
                .Find(t => t.UserId == dto.UserId && t.Day == dto.Day)
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                var update = Builders<Time>.Update
                    .Set(t => t.Opening, dto.Opening)
                    .Set(t => t.Closing, dto.Closing)
                    .Set(t => t.IsOpen, dto.IsOpen)
                    .Set(t => t.SalonName, dto.SalonName);

                await _timeCollection.UpdateOneAsync(
                    t => t.Id == existing.Id,
                    update
                );

                return existing;
            }
            else
            {
                var newTime = new Time
                {
                    Day = dto.Day,
                    Opening = dto.Opening,
                    Closing = dto.Closing,
                    IsOpen = dto.IsOpen,
                    UserId = dto.UserId,
                    SalonName = dto.SalonName
                };

                await _timeCollection.InsertOneAsync(newTime);
                return newTime;
            }
        }

        public async Task<bool> UpdateAsync(string userId, string day, TimeDto dto)
        {
            var filter = Builders<Time>.Filter.And(
                Builders<Time>.Filter.Eq(t => t.UserId, userId),
                Builders<Time>.Filter.Eq(t => t.Day, day)
            );

            var update = Builders<Time>.Update
                .Set(t => t.Opening, dto.Opening)
                .Set(t => t.Closing, dto.Closing)
                .Set(t => t.IsOpen, dto.IsOpen)
                .Set(t => t.SalonName, dto.SalonName);

            var result = await _timeCollection.UpdateOneAsync(filter, update);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> DeleteAsync(string userId, string day)
        {
            var filter = Builders<Time>.Filter.And(
                Builders<Time>.Filter.Eq(t => t.UserId, userId),
                Builders<Time>.Filter.Eq(t => t.Day, day)
            );

            var result = await _timeCollection.DeleteOneAsync(filter);
            return result.DeletedCount > 0;
        }
    }
}
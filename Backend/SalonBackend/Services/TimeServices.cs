using MongoDB.Driver;
using MongoDB.Bson;
using SalonBackend.Models;
using SalonBackend.Models.Dtos;

namespace SalonBackend.Services
{
    public class TimeService
    {
        private readonly IMongoCollection<Time> _timeCollection;

        public TimeService(IMongoDatabase database)
        {
            _timeCollection = database.GetCollection<Time>("Times");
        }

        public async Task<List<Time>> GetAllAsync()
        {
            return await _timeCollection.Find(_ => true).ToListAsync();
        }

        public async Task<Time?> GetByDayAsync(string day)
        {
            return await _timeCollection.Find(t => t.Day == day).FirstOrDefaultAsync();
        }

        public async Task<Time> CreateAsync(TimeDto dto)
        {
            var time = new Time
            {
                Day = dto.Day,
                Opening = dto.Opening,
                Closing = dto.Closing,
                IsOpen = dto.IsOpen
            };

            await _timeCollection.InsertOneAsync(time);
            return time;
        }

        public async Task<bool> UpdateAsync(string day, TimeDto dto)
        {
            var update = Builders<Time>.Update
                .Set(t => t.Opening, dto.Opening)
                .Set(t => t.Closing, dto.Closing)
                .Set(t => t.IsOpen, dto.IsOpen);

            var result = await _timeCollection.UpdateOneAsync(t => t.Day == day, update);
            return result.MatchedCount > 0;
        }

        public async Task<bool> DeleteAsync(string day)
        {
            var result = await _timeCollection.DeleteOneAsync(t => t.Day == day);
            return result.DeletedCount > 0;
        }
    }
}
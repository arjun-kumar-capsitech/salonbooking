using MongoDB.Driver;
using SalonBackend.Models;

namespace SalonBackend.Services
{
    public class CompanyService
    {
        private readonly IMongoCollection<Company> _company;

        public CompanyService(IMongoDatabase database)
        {
            _company = database.GetCollection<Company>("company");
        }

        public async Task<List<Company>> GetAllAsync()
        {
            return await _company.Find(_ => true).ToListAsync();
        }

        public async Task<Company?> GetByIdAsync(string id)
        {
            return await _company
                .Find(c => c.Id == id)
                .FirstOrDefaultAsync();
        }

        public async Task<Company> CreateAsync(Company company)
        {
            await _company.InsertOneAsync(company);
            return company;
        }

        public async Task<bool> UpdateAsync(string id, Company updatedCompany)
        {
            var result = await _company.ReplaceOneAsync( c => c.Id == id, updatedCompany);

            return result.ModifiedCount > 0;
        }

        public async Task<bool> DeleteAsync(string id)
        {
            var result = await _company.DeleteOneAsync(c => c.Id == id);
            return result.DeletedCount > 0;
        }
    }
}
using Microsoft.AspNetCore.Mvc;
using SalonBackend.Models;
using SalonBackend.Services;
using SalonBackend.Models.Dtos;

namespace SalonBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CompanyController : ControllerBase
    {
        private readonly CompanyService _companyService;

        public CompanyController(CompanyService companyService)
        {
            _companyService = companyService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllCompanies()
        {
            var companies = await _companyService.GetAllAsync();
            return Ok(companies);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetCompanyById(string id)
        {
            var company = await _companyService.GetByIdAsync(id);
            if (company == null) return NotFound();

            return Ok(company);
        }

        [HttpPost]
        public async Task<IActionResult> CreateCompany([FromBody] CompanyDto dto)
        {
            var company = new Company
            {
                SalonName = dto.SalonName,
                OwnerName = dto.OwnerName,
                Address = dto.Address,
                PhoneNumber = dto.PhoneNumber,
                Email = dto.Email,
                Status = dto.Status
            };

            var created = await _companyService.CreateAsync(company);

            return CreatedAtAction(nameof(GetCompanyById), new { id = created.Id }, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCompany(string id, [FromBody] CompanyDto dto)
        {
            var existing = await _companyService.GetByIdAsync(id);
            if (existing == null) return NotFound();

            existing.SalonName = dto.SalonName;
            existing.OwnerName = dto.OwnerName;
            existing.Address = dto.Address;
            existing.PhoneNumber = dto.PhoneNumber;
            existing.Email = dto.Email;
            existing.Status = dto.Status;

            var success = await _companyService.UpdateAsync(id, existing);
            if (!success) return StatusCode(500, "Failed to update");

            return Ok(existing);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCompany(string id)
        {
            var existing = await _companyService.GetByIdAsync(id);
            if (existing == null) return NotFound();

            var success = await _companyService.DeleteAsync(id);
            if (!success) return StatusCode(500, "Failed to delete");

            return Ok(new { message = "Company deleted successfully" });
        }
    }
}

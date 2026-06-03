using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MongoDB.Driver;
using SalonBackend.Services;
using System.Text;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "Salon Booking API", 
        Version = "v1",
        Description = "API for Salon Booking Application"
    });
});

try
{
    var mongoClient = new MongoClient(builder.Configuration.GetConnectionString("MongoDB") ?? "mongodb://localhost:27017");
    var database = mongoClient.GetDatabase(builder.Configuration["MongoDB:DatabaseName"] ?? "SalonBookingDB");
    builder.Services.AddSingleton<IMongoDatabase>(database);
    
 
    database.ListCollectionNames(); 
    Console.WriteLine("MongoDB connected successfully!");
}
catch (Exception ex)
{
    Console.WriteLine($"MongoDB Connection Failed: {ex.Message}");
}

builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<AdminService>();
builder.Services.AddScoped<StaffService>();
builder.Services.AddScoped<BookingService>();
builder.Services.AddScoped<TimeService>();
builder.Services.AddScoped<CompanyService>();

var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "your-super-secret-jwt-key-minimum-32-characters-long-here";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

var app = builder.Build();
app.UseCors("AllowAll");
app.UseSwagger();
app.UseSwaggerUI(c => 
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Salon Booking API v1");
    c.RoutePrefix = "swagger";
});

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/", () => Results.Redirect("/swagger"));
app.Run();


taskkill /f /im dotnet.exe   


Remove-Item -Path "backend/QRMenu.Infrastructure/Migrations/*" -Force


dotnet ef migrations add InitialCreate --project backend/QRMenu.Infrastructure --startup-project backend/QRMenu.API


dotnet ef database update --project backend/QRMenu.Infrastructure --startup-project backend/QRMenu.API


dotnet run --project backend/QRMenu.API



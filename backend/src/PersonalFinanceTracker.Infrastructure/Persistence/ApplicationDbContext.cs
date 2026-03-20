using Microsoft.EntityFrameworkCore;
using PersonalFinanceTracker.Domain.Entities;

namespace PersonalFinanceTracker.Infrastructure.Persistence;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<RecurringTransaction> RecurringTransactions => Set<RecurringTransaction>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasDefaultSchema("finance");

        modelBuilder.Entity<User>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<RefreshToken>().HasIndex(x => x.Token).IsUnique();
        modelBuilder.Entity<PasswordResetToken>().HasIndex(x => x.TokenHash).IsUnique();
        modelBuilder.Entity<Account>().Property(x => x.CurrentBalance).HasPrecision(12, 2);
        modelBuilder.Entity<Account>().Property(x => x.OpeningBalance).HasPrecision(12, 2);
        modelBuilder.Entity<Transaction>().Property(x => x.Amount).HasPrecision(12, 2);
        modelBuilder.Entity<Budget>().Property(x => x.Amount).HasPrecision(12, 2);
        modelBuilder.Entity<Goal>().Property(x => x.TargetAmount).HasPrecision(12, 2);
        modelBuilder.Entity<Goal>().Property(x => x.CurrentAmount).HasPrecision(12, 2);
        modelBuilder.Entity<RecurringTransaction>().Property(x => x.Amount).HasPrecision(12, 2);

        modelBuilder.Entity<UserSettings>()
            .HasIndex(x => x.UserId)
            .IsUnique();

        modelBuilder.Entity<Budget>()
            .HasIndex(x => new { x.UserId, x.CategoryId, x.Month, x.Year })
            .IsUnique();
    }
}

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PersonalFinanceTracker.Application.DTOs.Rules;
using PersonalFinanceTracker.Domain.Entities;

namespace PersonalFinanceTracker.Infrastructure.Persistence;

public sealed class DatabaseInitializer(ApplicationDbContext dbContext)
{
    private const string DemoSeedTag = "demo-seed-v1";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private static readonly (string Name, string Type, string Color, string Icon)[] DefaultCategories =
    [
        ("Food", "expense", "#4C8A87", "utensils"),
        ("Rent", "expense", "#244B66", "home"),
        ("Utilities", "expense", "#CC9C4B", "bolt"),
        ("Transport", "expense", "#6D7E91", "car"),
        ("Entertainment", "expense", "#8B6CA7", "film"),
        ("Shopping", "expense", "#C4665E", "shopping-bag"),
        ("Health", "expense", "#4C8B68", "heart-pulse"),
        ("Education", "expense", "#6B86A8", "book"),
        ("Travel", "expense", "#4F7EA8", "plane"),
        ("Subscriptions", "expense", "#9B7F5A", "repeat"),
        ("Miscellaneous", "expense", "#8D96A0", "boxes"),
        ("Salary", "income", "#4C8B68", "badge-indian-rupee"),
        ("Freelance", "income", "#3F6D8C", "briefcase"),
        ("Bonus", "income", "#CC9C4B", "sparkles"),
        ("Investment", "income", "#5C7A62", "chart-column"),
        ("Gift", "income", "#A06CA5", "gift"),
        ("Refund", "income", "#4D8899", "rotate-ccw"),
        ("Other", "income", "#6D7E91", "circle"),
    ];

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        await dbContext.Database.EnsureCreatedAsync(cancellationToken);
        await EnsureSharedAccountsSchemaAsync(cancellationToken);
        await EnsureOperationalSchemaAsync(cancellationToken);
        await EnsureRulesSchemaAsync(cancellationToken);
    }

    private async Task EnsureOperationalSchemaAsync(CancellationToken cancellationToken)
    {
        await dbContext.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE finance."Goals"
            ADD COLUMN IF NOT EXISTS "Icon" text NULL;
            """,
            cancellationToken);

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS finance."AccountActivityLogs" (
                "Id" uuid PRIMARY KEY,
                "UserId" uuid NOT NULL,
                "AccountId" uuid NULL,
                "ActorUserId" uuid NULL,
                "ActionType" text NOT NULL,
                "EntityType" text NOT NULL,
                "EntityId" uuid NULL,
                "Summary" text NOT NULL,
                "CreatedAtUtc" timestamp with time zone NOT NULL
            );
            """,
            cancellationToken);

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            CREATE INDEX IF NOT EXISTS "IX_AccountActivityLogs_UserId_CreatedAtUtc"
            ON finance."AccountActivityLogs" ("UserId", "CreatedAtUtc");
            """,
            cancellationToken);

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS finance."ProductEvents" (
                "Id" uuid PRIMARY KEY,
                "UserId" uuid NULL,
                "EventName" text NOT NULL,
                "MetadataJson" text NULL,
                "CreatedAtUtc" timestamp with time zone NOT NULL
            );
            """,
            cancellationToken);

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            CREATE INDEX IF NOT EXISTS "IX_ProductEvents_EventName_CreatedAtUtc"
            ON finance."ProductEvents" ("EventName", "CreatedAtUtc");
            """,
            cancellationToken);
    }

    private async Task EnsureSharedAccountsSchemaAsync(CancellationToken cancellationToken)
    {
        await dbContext.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS finance."AccountMembers" (
                "Id" uuid PRIMARY KEY,
                "AccountId" uuid NOT NULL,
                "UserId" uuid NOT NULL,
                "Role" text NOT NULL,
                "AddedByUserId" uuid NOT NULL,
                "CreatedAtUtc" timestamp with time zone NOT NULL
            );
            """,
            cancellationToken);

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_AccountMembers_AccountId_UserId"
            ON finance."AccountMembers" ("AccountId", "UserId");
            """,
            cancellationToken);

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            CREATE INDEX IF NOT EXISTS "IX_AccountMembers_UserId"
            ON finance."AccountMembers" ("UserId");
            """,
            cancellationToken);
    }

    public async Task SeedDefaultCategoriesForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var existing = await dbContext.Categories.AnyAsync(x => x.UserId == userId, cancellationToken);
        if (existing)
        {
            return;
        }

        var categories = DefaultCategories.Select(item => new Category
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = item.Name,
            Type = item.Type,
            Color = item.Color,
            Icon = item.Icon,
            IsArchived = false,
        });

        await dbContext.Categories.AddRangeAsync(categories, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task SeedDemoDataForExistingUsersAsync(CancellationToken cancellationToken = default)
    {
        var userIds = await dbContext.Users
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        foreach (var userId in userIds)
        {
            await SeedDemoDataForUserAsync(userId, cancellationToken);
        }
    }

    public async Task SeedDemoDataForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await SeedDefaultCategoriesForUserAsync(userId, cancellationToken);

        var hasDemoTransactions = await dbContext.Transactions.AnyAsync(
            x => x.UserId == userId && x.Tags.Contains(DemoSeedTag),
            cancellationToken);

        var hasBudgets = await dbContext.Budgets.AnyAsync(x => x.UserId == userId, cancellationToken);
        var hasGoals = await dbContext.Goals.AnyAsync(x => x.UserId == userId, cancellationToken);
        var hasRecurring = await dbContext.RecurringTransactions.AnyAsync(x => x.UserId == userId, cancellationToken);
        var hasRules = await dbContext.Rules.AnyAsync(x => x.UserId == userId, cancellationToken);

        var account = await dbContext.Accounts
            .Where(x => x.UserId == userId)
            .OrderBy(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (account is null)
        {
            account = new Account
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "Bank Account",
                Type = "bank",
                OpeningBalance = 85000m,
                CurrentBalance = 85000m,
                InstitutionName = "Fitra Test Bank",
                CreatedAtUtc = DateTime.UtcNow,
                LastUpdatedAtUtc = DateTime.UtcNow,
            };

            dbContext.Accounts.Add(account);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var categories = await dbContext.Categories
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken);

        if (!hasDemoTransactions)
        {
            SeedDemoTransactions(userId, account, categories);
        }

        if (!hasRecurring)
        {
            SeedRecurringTransactions(userId, account, categories);
        }

        if (!hasBudgets)
        {
            SeedBudgets(userId, categories);
        }

        if (!hasGoals)
        {
            SeedGoals(userId, account);
        }

        if (!hasRules)
        {
            SeedRules(userId, categories);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureRulesSchemaAsync(CancellationToken cancellationToken)
    {
        await dbContext.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS finance."Rules" (
                "Id" uuid PRIMARY KEY,
                "UserId" uuid NOT NULL,
                "Name" text NOT NULL,
                "IsEnabled" boolean NOT NULL DEFAULT TRUE,
                "Priority" integer NOT NULL DEFAULT 100,
                "ConditionsJson" text NOT NULL,
                "ActionsJson" text NOT NULL,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NOT NULL
            );
            """,
            cancellationToken);

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            CREATE INDEX IF NOT EXISTS "IX_Rules_UserId_Priority"
            ON finance."Rules" ("UserId", "Priority");
            """,
            cancellationToken);

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE finance."Transactions"
            ADD COLUMN IF NOT EXISTS "AppliedRuleNames" text[] NOT NULL DEFAULT ARRAY[]::text[];
            """,
            cancellationToken);

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE finance."Transactions"
            ADD COLUMN IF NOT EXISTS "NeedsReview" boolean NOT NULL DEFAULT FALSE;
            """,
            cancellationToken);
    }

    private void SeedDemoTransactions(Guid userId, Account account, IReadOnlyCollection<Category> categories)
    {
        var categoryLookup = categories.ToDictionary(x => x.Name, StringComparer.OrdinalIgnoreCase);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var transactions = new List<Transaction>();

        AddMonthlySalary(transactions, userId, account, categoryLookup["Salary"].Id, today);
        AddMonthlyFixedExpenses(transactions, userId, account, categoryLookup, today);
        AddWeeklyLivingExpenses(transactions, userId, account, categoryLookup, today);
        AddNiceToHaveExpenses(transactions, userId, account, categoryLookup, today);
        AddOneOffCredits(transactions, userId, account, categoryLookup, today);

        foreach (var transaction in transactions
                     .OrderBy(x => x.TransactionDate)
                     .ThenBy(x => x.CreatedAtUtc))
        {
            ApplyTransactionToAccount(account, transaction);
            dbContext.Transactions.Add(transaction);
        }
    }

    private void SeedRecurringTransactions(Guid userId, Account account, IReadOnlyCollection<Category> categories)
    {
        var categoryLookup = categories.ToDictionary(x => x.Name, StringComparer.OrdinalIgnoreCase);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart = new DateOnly(today.Year, today.Month, 1);

        dbContext.RecurringTransactions.AddRange(
            new RecurringTransaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = "Monthly Salary",
                Type = "income",
                Amount = 92500m,
                CategoryId = categoryLookup["Salary"].Id,
                AccountId = account.Id,
                Frequency = "monthly",
                StartDate = monthStart.AddMonths(-6),
                NextRunDate = monthStart.AddMonths(1),
                AutoCreateTransaction = false,
                IsPaused = false,
            },
            new RecurringTransaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = "Apartment Rent",
                Type = "expense",
                Amount = 24000m,
                CategoryId = categoryLookup["Rent"].Id,
                AccountId = account.Id,
                Frequency = "monthly",
                StartDate = monthStart.AddMonths(-6).AddDays(2),
                NextRunDate = monthStart.AddMonths(1).AddDays(2),
                AutoCreateTransaction = false,
                IsPaused = false,
            },
            new RecurringTransaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = "SIP Investment",
                Type = "expense",
                Amount = 8000m,
                CategoryId = categoryLookup["Subscriptions"].Id,
                AccountId = account.Id,
                Frequency = "monthly",
                StartDate = monthStart.AddMonths(-6).AddDays(4),
                NextRunDate = monthStart.AddMonths(1).AddDays(4),
                AutoCreateTransaction = false,
                IsPaused = false,
            },
            new RecurringTransaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = "Streaming Bundle",
                Type = "expense",
                Amount = 649m,
                CategoryId = categoryLookup["Subscriptions"].Id,
                AccountId = account.Id,
                Frequency = "monthly",
                StartDate = monthStart.AddMonths(-6).AddDays(8),
                NextRunDate = monthStart.AddMonths(1).AddDays(8),
                AutoCreateTransaction = false,
                IsPaused = false,
            });
    }

    private void SeedBudgets(Guid userId, IReadOnlyCollection<Category> categories)
    {
        var expenseBudgetTargets = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase)
        {
            ["Food"] = 12000m,
            ["Transport"] = 6500m,
            ["Entertainment"] = 4500m,
            ["Shopping"] = 7000m,
            ["Utilities"] = 5000m,
            ["Health"] = 3000m,
            ["Subscriptions"] = 2500m,
        };

        var today = DateTime.UtcNow;

        foreach (var category in categories.Where(x => expenseBudgetTargets.ContainsKey(x.Name)))
        {
            dbContext.Budgets.Add(new Budget
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                CategoryId = category.Id,
                Month = today.Month,
                Year = today.Year,
                Amount = expenseBudgetTargets[category.Name],
                AlertThresholdPercent = 80,
            });
        }
    }

    private void SeedGoals(Guid userId, Account account)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        dbContext.Goals.AddRange(
            new Goal
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "Emergency Fund",
                TargetAmount = 300000m,
                CurrentAmount = 132000m,
                TargetDate = today.AddMonths(8),
                LinkedAccountId = account.Id,
                Status = "active",
                Color = "#4C8B68",
            },
            new Goal
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "Goa Vacation",
                TargetAmount = 90000m,
                CurrentAmount = 38000m,
                TargetDate = today.AddMonths(5),
                LinkedAccountId = account.Id,
                Status = "active",
                Color = "#4F7EA8",
            },
            new Goal
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "New Laptop Upgrade",
                TargetAmount = 145000m,
                CurrentAmount = 96000m,
                TargetDate = today.AddMonths(4),
                LinkedAccountId = account.Id,
                Status = "active",
                Color = "#CC9C4B",
            });
    }

    private void SeedRules(Guid userId, IReadOnlyCollection<Category> categories)
    {
        var categoryLookup = categories.ToDictionary(x => x.Name, StringComparer.OrdinalIgnoreCase);

        dbContext.Rules.AddRange(
            BuildRule(
                userId,
                "Auto-categorize food delivery",
                220,
                [new RuleConditionDto("merchant", "contains", "swiggy")],
                [
                    new RuleActionDto("set_category", categoryLookup["Food"].Id.ToString()),
                    new RuleActionDto("add_tag", "food-delivery"),
                ]),
            BuildRule(
                userId,
                "Route groceries to Food",
                210,
                [new RuleConditionDto("merchant", "contains", "blinkit")],
                [
                    new RuleActionDto("set_category", categoryLookup["Food"].Id.ToString()),
                    new RuleActionDto("add_tag", "groceries"),
                ]),
            BuildRule(
                userId,
                "Mark rides as commute",
                200,
                [new RuleConditionDto("merchant", "contains", "quickride")],
                [
                    new RuleActionDto("set_category", categoryLookup["Transport"].Id.ToString()),
                    new RuleActionDto("add_tag", "commute"),
                ]),
            BuildRule(
                userId,
                "Streaming bills to subscriptions",
                190,
                [new RuleConditionDto("merchant", "contains", "stream")],
                [
                    new RuleActionDto("set_category", categoryLookup["Subscriptions"].Id.ToString()),
                    new RuleActionDto("add_tag", "subscription"),
                ]),
            BuildRule(
                userId,
                "Large expenses need review",
                160,
                [
                    new RuleConditionDto("type", "equals", "expense"),
                    new RuleConditionDto("amount", "greater_than", "15000"),
                ],
                [new RuleActionDto("flag_review", null)]),
            BuildRule(
                userId,
                "Salary credits stay tagged",
                170,
                [
                    new RuleConditionDto("merchant", "contains", "acme"),
                    new RuleConditionDto("type", "equals", "income"),
                ],
                [
                    new RuleActionDto("set_category", categoryLookup["Salary"].Id.ToString()),
                    new RuleActionDto("add_tag", "salary"),
                ]));
    }

    private static void AddMonthlySalary(
        ICollection<Transaction> transactions,
        Guid userId,
        Account account,
        Guid salaryCategoryId,
        DateOnly today)
    {
        for (var offset = 5; offset >= 0; offset--)
        {
            var month = today.AddMonths(-offset);
            var monthStart = new DateOnly(month.Year, month.Month, 1);
            var salaryDate = monthStart.AddDays(1);
            var salaryAmount = offset == 0 ? 92500m : 90000m + ((5 - offset) * 1250m);

            transactions.Add(BuildTransaction(
                userId,
                account.Id,
                salaryCategoryId,
                "income",
                salaryAmount,
                salaryDate,
                "Acme Product Studio",
                "Monthly salary credit",
                "Bank transfer"));
        }
    }

    private static void AddMonthlyFixedExpenses(
        ICollection<Transaction> transactions,
        Guid userId,
        Account account,
        IReadOnlyDictionary<string, Category> categories,
        DateOnly today)
    {
        for (var offset = 5; offset >= 0; offset--)
        {
            var month = today.AddMonths(-offset);
            var monthStart = new DateOnly(month.Year, month.Month, 1);

            transactions.Add(BuildTransaction(userId, account.Id, categories["Rent"].Id, "expense", 24000m, monthStart.AddDays(2), "Oak Residency", "Monthly rent", "UPI"));
            transactions.Add(BuildTransaction(userId, account.Id, categories["Utilities"].Id, "expense", 2850m + (offset % 2 == 0 ? 120m : 340m), monthStart.AddDays(6), "Tata Power", "Electricity and water", "Net banking"));
            transactions.Add(BuildTransaction(userId, account.Id, categories["Subscriptions"].Id, "expense", 649m, monthStart.AddDays(8), "Streaming Bundle", "Music and video subscriptions", "Card"));
            transactions.Add(BuildTransaction(userId, account.Id, categories["Transport"].Id, "expense", 2100m + (offset * 140m), monthStart.AddDays(10), "Metro Card", "Monthly commute top-up", "UPI"));
            transactions.Add(BuildTransaction(userId, account.Id, categories["Health"].Id, "expense", 1200m + (offset % 3 * 300m), monthStart.AddDays(12), "Pharmacy Plus", "Medicine and essentials", "Card"));
        }
    }

    private static void AddWeeklyLivingExpenses(
        ICollection<Transaction> transactions,
        Guid userId,
        Account account,
        IReadOnlyDictionary<string, Category> categories,
        DateOnly today)
    {
        for (var weekOffset = 0; weekOffset < 16; weekOffset++)
        {
            var date = today.AddDays(-(weekOffset * 7));
            if (date.Day <= 2)
            {
                continue;
            }

            transactions.Add(BuildTransaction(userId, account.Id, categories["Food"].Id, "expense", 780m + ((weekOffset % 4) * 135m), date, "Fresh Basket", "Groceries and snacks", "UPI"));
            transactions.Add(BuildTransaction(userId, account.Id, categories["Transport"].Id, "expense", 320m + ((weekOffset % 3) * 90m), date.AddDays(-1), "QuickRide", "Local commute", "UPI"));

            if (weekOffset % 2 == 0)
            {
                transactions.Add(BuildTransaction(userId, account.Id, categories["Entertainment"].Id, "expense", 950m + ((weekOffset % 3) * 180m), date.AddDays(-2), "BookMyShow", "Weekend movie or outing", "Card"));
            }
        }
    }

    private static void AddNiceToHaveExpenses(
        ICollection<Transaction> transactions,
        Guid userId,
        Account account,
        IReadOnlyDictionary<string, Category> categories,
        DateOnly today)
    {
        var extras = new (int DaysAgo, string Category, decimal Amount, string Merchant, string Note, string PaymentMethod)[]
        {
            (9, "Shopping", 3499m, "Uniqlo", "Workwear refresh", "Card"),
            (18, "Food", 1890m, "Swiggy", "Team dinner order", "UPI"),
            (27, "Travel", 6200m, "IRCTC", "Train tickets for family visit", "Card"),
            (34, "Education", 2499m, "Udemy", "React and data viz course", "Card"),
            (41, "Health", 4200m, "Cult", "Quarterly fitness renewal", "UPI"),
            (52, "Shopping", 5999m, "Amazon", "Headphones replacement", "Card"),
            (63, "Entertainment", 2200m, "Phoenix Mall", "Bowling and dinner", "Card"),
            (74, "Travel", 18500m, "MakeMyTrip", "Weekend staycation", "Card"),
            (88, "Miscellaneous", 1450m, "Local Services", "Home repairs", "UPI"),
            (102, "Food", 2600m, "Blinkit", "Monthly pantry refill", "UPI"),
        };

        foreach (var extra in extras)
        {
            var date = today.AddDays(-extra.DaysAgo);
            transactions.Add(BuildTransaction(
                userId,
                account.Id,
                categories[extra.Category].Id,
                "expense",
                extra.Amount,
                date,
                extra.Merchant,
                extra.Note,
                extra.PaymentMethod));
        }
    }

    private static void AddOneOffCredits(
        ICollection<Transaction> transactions,
        Guid userId,
        Account account,
        IReadOnlyDictionary<string, Category> categories,
        DateOnly today)
    {
        var credits = new (int DaysAgo, string Category, decimal Amount, string Merchant, string Note)[]
        {
            (22, "Freelance", 18500m, "Northstar Labs", "Landing page contract payout"),
            (57, "Refund", 2400m, "Airline Refund", "Cancelled add-on refund"),
            (79, "Bonus", 12000m, "Acme Product Studio", "Quarterly performance bonus"),
            (96, "Investment", 5400m, "Index Fund", "Dividend credit"),
        };

        foreach (var credit in credits)
        {
            var date = today.AddDays(-credit.DaysAgo);
            transactions.Add(BuildTransaction(
                userId,
                account.Id,
                categories[credit.Category].Id,
                "income",
                credit.Amount,
                date,
                credit.Merchant,
                credit.Note,
                "Bank transfer"));
        }
    }

    private static Transaction BuildTransaction(
        Guid userId,
        Guid accountId,
        Guid? categoryId,
        string type,
        decimal amount,
        DateOnly transactionDate,
        string merchant,
        string note,
        string paymentMethod)
    {
        var createdAt = DateTime.SpecifyKind(transactionDate.ToDateTime(new TimeOnly(9, 0)), DateTimeKind.Utc);

        return new Transaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AccountId = accountId,
            CategoryId = categoryId,
            Type = type,
            Amount = amount,
            TransactionDate = transactionDate,
            Merchant = merchant,
            Note = note,
            PaymentMethod = paymentMethod,
            Tags = [DemoSeedTag],
            CreatedAtUtc = createdAt,
            UpdatedAtUtc = createdAt,
        };
    }

    private static void ApplyTransactionToAccount(Account account, Transaction transaction)
    {
        if (transaction.Type == "income")
        {
            account.CurrentBalance += transaction.Amount;
        }
        else
        {
            account.CurrentBalance -= transaction.Amount;
        }

        account.LastUpdatedAtUtc = DateTime.UtcNow;
    }

    private static Rule BuildRule(
        Guid userId,
        string name,
        int priority,
        IReadOnlyList<RuleConditionDto> conditions,
        IReadOnlyList<RuleActionDto> actions)
    {
        return new Rule
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            IsEnabled = true,
            Priority = priority,
            ConditionsJson = JsonSerializer.Serialize(conditions, JsonOptions),
            ActionsJson = JsonSerializer.Serialize(actions, JsonOptions),
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow,
        };
    }
}

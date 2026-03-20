import axios from "axios";
import { FormEvent, useEffect, useState } from "react";
import { PageIntro } from "@/components/ui/PageIntro";
import { api } from "@/services/api";
import type { Category } from "@/types/api";

const initialForm = {
  name: "",
  type: "expense",
  color: "#4C8A87",
};

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadCategories() {
    const { data } = await api.get<Category[]>("/categories", { params: { includeArchived: true } });
    setCategories(data);
  }

  useEffect(() => {
    loadCategories().catch(() => setMessage("Failed to load categories."));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const payload = {
      name: form.name,
      type: form.type,
      color: form.color || null,
    };

    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, payload);
        setMessage("Category updated successfully.");
      } else {
        await api.post("/categories", payload);
        setMessage("Category created successfully.");
      }

      setForm(initialForm);
      setEditingId(null);
      await loadCategories();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.message ?? "Failed to save category.");
      } else {
        setMessage("Failed to save category.");
      }
    }
  }

  async function archiveCategory(id: string) {
    setMessage(null);

    try {
      await api.delete(`/categories/${id}`);
      if (editingId === id) {
        setEditingId(null);
        setForm(initialForm);
      }
      setMessage("Category archived successfully.");
      await loadCategories();
    } catch {
      setMessage("Failed to archive category.");
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      type: category.type,
      color: category.color ?? "#4C8A87",
    });
  }

  const expenseCategories = categories.filter((category) => category.type === "expense");
  const incomeCategories = categories.filter((category) => category.type === "income");

  return (
    <section className="space-y-6">
      <PageIntro
        eyebrow="Categories"
        title="Shape how income and expense activity gets organized"
        description="Manage the labels that power budgets, reports, and transaction entry. You can add custom categories, tweak their look, and archive old ones without losing history. If you recreate an archived name, Fitra will restore it instead of blocking you."
      />

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <form className="space-y-4 rounded-xl2 border border-border bg-canvas p-6" onSubmit={onSubmit}>
          <h3 className="text-xl font-semibold">{editingId ? "Edit Category" : "New Category"}</h3>

          <select
            className="w-full rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            value={form.type}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>

          <input
            className="w-full rounded-2xl border border-border px-4 py-3"
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Category name"
            required
            value={form.name}
          />

          <label className="block text-sm text-ink/75">
            Color
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-border px-2 py-2"
              onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
              type="color"
              value={form.color}
            />
          </label>

          <p className="text-sm text-ink/60">
            Use `income` for money coming in, like Salary or Savings. Use `expense` for money going out, like Food or Rent.
          </p>

          {message ? <p className="text-sm text-ink/70">{message}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white" type="submit">
              {editingId ? "Save Changes" : "Save Category"}
            </button>
            {editingId ? (
              <button
                className="rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-ink"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                }}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <section className="rounded-xl2 border border-border bg-canvas p-6">
          <h3 className="text-xl font-semibold">Category Library</h3>
          <div className="mt-5 space-y-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-ink/45">Expense Categories</p>
              {expenseCategories.length === 0 ? (
                <p className="text-sm text-ink/65">No expense categories yet.</p>
              ) : (
                expenseCategories.map((category) => (
                  <article key={category.id} className="rounded-2xl bg-white p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: category.color ?? "#244B66" }}
                        >
                          {category.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold text-ink">{category.name}</p>
                          <p className="mt-1 text-sm text-ink/55">{category.isArchived ? "archived" : "active"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!category.isArchived ? (
                          <>
                            <button
                              className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
                              onClick={() => startEdit(category)}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white"
                              onClick={() => archiveCategory(category.id)}
                              type="button"
                            >
                              Archive
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-ink/45">Income Categories</p>
              {incomeCategories.length === 0 ? (
                <p className="text-sm text-ink/65">No income categories yet.</p>
              ) : (
                incomeCategories.map((category) => (
                <article key={category.id} className="rounded-2xl bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: category.color ?? "#244B66" }}
                      >
                        {category.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-semibold text-ink">{category.name}</p>
                        <p className="mt-1 text-sm text-ink/55">{category.isArchived ? "archived" : "active"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!category.isArchived ? (
                        <>
                          <button
                            className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
                            onClick={() => startEdit(category)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white"
                            onClick={() => archiveCategory(category.id)}
                            type="button"
                          >
                            Archive
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

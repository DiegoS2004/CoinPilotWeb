-- Insert default categories
INSERT INTO categories (name, icon, color) VALUES
('Comida', '🍽️', '#ef4444'),
('Transporte', '🚗', '#3b82f6'),
('Entretenimiento', '🎬', '#8b5cf6'),
('Compras', '🛍️', '#ec4899'),
('Salud', '🏥', '#10b981'),
('Educación', '📚', '#f59e0b'),
('Servicios', '💡', '#6b7280'),
('Salario', '💰', '#22c55e'),
('Freelance', '💻', '#06b6d4'),
('Inversiones', '📈', '#84cc16'),
('Otros Ingresos', '💵', '#a3a3a3'),
('Otros Gastos', '📦', '#64748b')
ON CONFLICT DO NOTHING;

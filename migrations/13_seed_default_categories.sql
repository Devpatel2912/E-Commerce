-- Ensure standard baseline categories exist and sequence is synchronized
INSERT INTO categories (id, name, description)
VALUES
  (1, 'Mobiles & Tablets', 'Smartphones, mobile phones, tablets, and accessories'),
  (2, 'Electronics', 'Laptops, computers, audio gear, and gadgets'),
  (3, 'Vehicles', 'Cars, motorbikes, bicycles, and automotive parts'),
  (4, 'Furniture', 'Desks, ergonomic chairs, tables, and sofas'),
  (5, 'Books', 'Programming, science, and fiction books'),
  (6, 'Clothing', 'Apparel, jackets, footwear, and accessories'),
  (7, 'Books & Education', 'Educational materials, textbooks, and courses')
ON CONFLICT (id) DO NOTHING;

-- Synchronize sequence
SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM categories));


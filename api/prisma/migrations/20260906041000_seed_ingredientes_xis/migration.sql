DELETE FROM ingrediente_produto
WHERE produto_id IN (
  SELECT id FROM produto
  WHERE nome IN (
    'X Burguer',
    'Xis Egg',
    'Xis Frango',
    'Xis Salada',
    'Xis Tudo',
    'Xis Vegetariano'
  )
);

INSERT INTO ingrediente_produto (id, produto_id, nome, ordem, "createdAt", "updatedAt")
SELECT gen_random_uuid(), p.id, v.nome, v.ordem, NOW(), NOW()
FROM produto p
JOIN (
  VALUES
    ('X Burguer', 'Queijo', 0),
    ('X Burguer', 'Maionese caseira', 1),
    ('Xis Egg', 'Hambúrguer de carne bovina', 0),
    ('Xis Egg', 'Queijo', 1),
    ('Xis Egg', 'Ovo', 2),
    ('Xis Egg', 'Presunto de frango', 3),
    ('Xis Egg', 'Alface', 4),
    ('Xis Egg', 'Tomate', 5),
    ('Xis Egg', 'Milho', 6),
    ('Xis Egg', 'Ervilha', 7),
    ('Xis Egg', 'Maionese caseira', 8),
    ('Xis Frango', 'Filé de frango', 0),
    ('Xis Frango', 'Queijo', 1),
    ('Xis Frango', 'Presunto de frango', 2),
    ('Xis Frango', 'Alface', 3),
    ('Xis Frango', 'Tomate', 4),
    ('Xis Frango', 'Milho', 5),
    ('Xis Frango', 'Ervilha', 6),
    ('Xis Frango', 'Maionese caseira', 7),
    ('Xis Salada', 'Hambúrguer de carne bovina', 0),
    ('Xis Salada', 'Queijo', 1),
    ('Xis Salada', 'Presunto de frango', 2),
    ('Xis Salada', 'Alface', 3),
    ('Xis Salada', 'Tomate', 4),
    ('Xis Salada', 'Milho', 5),
    ('Xis Salada', 'Ervilha', 6),
    ('Xis Salada', 'Maionese caseira', 7),
    ('Xis Tudo', 'Hambúrguer de carne bovina', 0),
    ('Xis Tudo', 'Frango', 1),
    ('Xis Tudo', 'Ovo', 2),
    ('Xis Tudo', 'Queijo', 3),
    ('Xis Tudo', 'Presunto de frango', 4),
    ('Xis Tudo', 'Alface', 5),
    ('Xis Tudo', 'Tomate', 6),
    ('Xis Tudo', 'Milho', 7),
    ('Xis Tudo', 'Ervilha', 8),
    ('Xis Tudo', 'Maionese caseira', 9),
    ('Xis Vegetariano', 'Hambúrguer de soja', 0),
    ('Xis Vegetariano', 'Queijo', 1),
    ('Xis Vegetariano', 'Alface', 2),
    ('Xis Vegetariano', 'Tomate', 3),
    ('Xis Vegetariano', 'Milho', 4),
    ('Xis Vegetariano', 'Ervilha', 5),
    ('Xis Vegetariano', 'Maionese caseira', 6)
) AS v(produto_nome, nome, ordem)
  ON p.nome = v.produto_nome;

DELETE FROM ingrediente_produto
WHERE nome = 'Pão';

DELETE FROM ingrediente_produto i
USING produto p
WHERE i.produto_id = p.id
  AND p.nome = 'X Burguer'
  AND i.nome IN ('Carne bovina', 'Hambúrguer de carne bovina');

UPDATE ingrediente_produto i
SET ordem = sub.nova_ordem,
    "updatedAt" = NOW()
FROM (
  SELECT
    i2.id,
    ROW_NUMBER() OVER (PARTITION BY i2.produto_id ORDER BY i2.ordem, i2.nome) - 1 AS nova_ordem
  FROM ingrediente_produto i2
) AS sub
WHERE i.id = sub.id;

ERROR:  42803: aggregate functions are not allowed in WHERE
LINE 171: WHERE i.amount_paid != COALESCE(SUM(pa.allocated_amount), 0)
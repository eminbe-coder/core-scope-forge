-- Add triggers for contract payment terms auditing and automation

-- Create trigger for payment term audit logging
CREATE TRIGGER trigger_log_payment_audit_trail
  AFTER INSERT OR UPDATE ON contract_payment_terms
  FOR EACH ROW
  EXECUTE FUNCTION log_payment_audit_trail();

-- Create trigger for todo audit logging  
CREATE TRIGGER trigger_log_todo_audit_trail
  AFTER INSERT OR UPDATE ON contract_todos
  FOR EACH ROW
  EXECUTE FUNCTION log_todo_audit_trail();

-- Create trigger for contract audit logging
CREATE TRIGGER trigger_log_contract_audit_trail
  AFTER INSERT OR UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION log_contract_audit_trail();

-- Create trigger to update payment stage when todos are completed
CREATE TRIGGER trigger_update_payment_stage_on_todo_completion
  AFTER UPDATE ON contract_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_stage_on_todo_completion();

-- Create trigger to set payment as due if no todos exist
CREATE TRIGGER trigger_set_payment_due_if_no_todos
  BEFORE INSERT ON contract_payment_terms
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_due_if_no_todos();
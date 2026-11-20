import { ExpensesWorkspace } from "@/components/expenses/expenses-workspace";
import { getExpenses, getAccounts } from "@/lib/business";
export default async function ExpensesPage(){
 const [expenses,accounts]=await Promise.all([getExpenses(),getAccounts()]);
 return <ExpensesWorkspace expenses={expenses} accounts={accounts}/>;
}

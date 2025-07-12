<!-- src/routes/money/+page.svelte -->
<script>
  import { useClients } from '$lib/stores/client.svelte';
  import { onMount } from 'svelte';
  import Icon from '$lib/components/icons/Icon.svelte';
  
  const clients = useClients();
  
  // Mock financial data - replace with your actual store
  let invoices = $state([
    {
      id: 1,
      number: 'INV-2025-001',
      clientId: 1,
      clientName: 'Acme Corp',
      amount: 5000,
      status: 'paid',
      dueDate: '2025-01-15',
      issuedDate: '2024-12-15',
      items: [
        { description: 'Website Development', amount: 4000 },
        { description: 'Monthly Maintenance', amount: 1000 }
      ]
    },
    {
      id: 2,
      number: 'INV-2025-002',
      clientId: 2,
      clientName: 'TechStart Inc',
      amount: 3500,
      status: 'pending',
      dueDate: '2025-01-20',
      issuedDate: '2025-01-05'
    },
    {
      id: 3,
      number: 'INV-2024-098',
      clientId: 1,
      clientName: 'Acme Corp',
      amount: 4500,
      status: 'overdue',
      dueDate: '2024-12-31',
      issuedDate: '2024-12-01'
    }
  ]);
  
  let expenses = $state([
    { id: 1, description: 'Adobe Creative Suite', amount: 54.99, date: '2025-01-01', category: 'Software' },
    { id: 2, description: 'AWS Hosting', amount: 142.30, date: '2025-01-01', category: 'Infrastructure' },
    { id: 3, description: 'Office Supplies', amount: 67.45, date: '2025-01-03', category: 'Office' }
  ]);
  
  let activeTab = $state('overview');
  let showNewInvoiceForm = $state(false);
  
  // Calculate financial metrics
  let metrics = $derived(() => {
    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);
    
    const pendingAmount = invoices
      .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.amount, 0);
    
    const totalExpenses = expenses
      .reduce((sum, exp) => sum + exp.amount, 0);
    
    const profit = totalRevenue - totalExpenses;
    
    return {
      totalRevenue,
      pendingAmount,
      totalExpenses,
      profit,
      invoiceCount: invoices.length,
      paidCount: invoices.filter(inv => inv.status === 'paid').length
    };
  });
  
  // Filter invoices by client if selected
  let filteredInvoices = $derived(() => {
    if (clients.selectedClient) {
      return invoices.filter(inv => inv.clientId === clients.selectedClient.id);
    }
    return invoices;
  });
  
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  function getStatusColor(status) {
    switch(status) {
      case 'paid': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'pending': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'overdue': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
    }
  }
  
  function markAsPaid(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      invoice.status = 'paid';
    }
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
  <!-- Header -->
  <header class="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20">
    <div class="px-4 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Money</h1>
          {#if clients.selectedClient}
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Finances for {clients.selectedClient.name}
            </p>
          {/if}
        </div>
        <button
          onclick={() => showNewInvoiceForm = true}
          class="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Icon name="plus" class="w-5 h-5" />
          New Invoice
        </button>
      </div>
      
      <!-- Tab Navigation -->
      <div class="flex gap-2 mt-4 border-b border-gray-200">
        <button
          onclick={() => activeTab = 'overview'}
          class="pb-2 px-1 {activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}"
        >
          Overview
        </button>
        <button
          onclick={() => activeTab = 'invoices'}
          class="pb-2 px-1 {activeTab === 'invoices' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}"
        >
          Invoices
        </button>
        <button
          onclick={() => activeTab = 'expenses'}
          class="pb-2 px-1 {activeTab === 'expenses' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}"
        >
          Expenses
        </button>
      </div>
    </div>
  </header>
  
  <!-- Content -->
  <div class="p-4">
    {#if activeTab === 'overview'}
      <!-- Financial Overview -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <p class="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(metrics().totalRevenue)}</p>
          <p class="text-xs text-green-600 dark:text-green-400 mt-1">+12% from last month</p>
        </div>
        
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <p class="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{formatCurrency(metrics().pendingAmount)}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{metrics().invoiceCount - metrics().paidCount} invoices</p>
        </div>
        
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <p class="text-sm text-gray-500 dark:text-gray-400">Expenses</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(metrics().totalExpenses)}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">This month</p>
        </div>
        
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <p class="text-sm text-gray-500 dark:text-gray-400">Profit</p>
          <p class="text-2xl font-bold {metrics().profit >= 0 ? 'text-green-600' : 'text-red-600'}">
            {formatCurrency(metrics().profit)}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">After expenses</p>
        </div>
      </div>
      
      <!-- Recent Activity -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Recent Activity</h3>
        <div class="space-y-3">
          {#each [...invoices].slice(0, 3) as invoice}
            <div class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div>
                <p class="font-medium text-gray-900 dark:text-gray-100">{invoice.number}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">{invoice.clientName}</p>
              </div>
              <div class="text-right">
                <p class="font-medium">{formatCurrency(invoice.amount)}</p>
                <span class="text-xs px-2 py-1 rounded-full {getStatusColor(invoice.status)}">
                  {invoice.status}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    {#if activeTab === 'invoices'}
      <!-- Invoices List -->
      <div class="space-y-3">
        {#each filteredInvoices() as invoice}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-3">
                  <h3 class="font-medium text-gray-900 dark:text-gray-100">{invoice.number}</h3>
                  <span class="text-xs px-2 py-1 rounded-full {getStatusColor(invoice.status)}">
                    {invoice.status}
                  </span>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{invoice.clientName}</p>
                <div class="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                  <span>Issued: {new Date(invoice.issuedDate).toLocaleDateString()}</span>
                  <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                </div>
              </div>
              <div class="text-right">
                <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(invoice.amount)}</p>
                {#if invoice.status !== 'paid'}
                  <button
                    onclick={() => markAsPaid(invoice.id)}
                    class="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                  >
                    Mark as paid
                  </button>
                {/if}
              </div>
            </div>
          </div>
        {/each}
        
        {#if filteredInvoices().length === 0}
          <div class="text-center py-12">
            <Icon name="document" class="w-16 h-16 mx-auto text-gray-300" size={2} />
            <p class="text-gray-500 dark:text-gray-400 mt-4">No invoices found</p>
          </div>
        {/if}
      </div>
    {/if}
    
    {#if activeTab === 'expenses'}
      <!-- Expenses List -->
      <div class="space-y-3">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">Recent Expenses</h3>
          {#each expenses as expense}
            <div class="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div>
                <p class="font-medium text-gray-900 dark:text-gray-100">{expense.description}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">{expense.category} • {new Date(expense.date).toLocaleDateString()}</p>
              </div>
              <p class="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(expense.amount)}</p>
            </div>
          {/each}
        </div>
        
        <button class="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 text-center text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          + Add Expense
        </button>
      </div>
    {/if}
  </div>
</div>

<!-- New Invoice Modal (Simplified) -->
{#if showNewInvoiceForm}
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6">
      <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">New Invoice</h2>
      
      <div class="space-y-4">
        <div class="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <Icon name="document" class="w-12 h-12 mx-auto text-gray-400" size={2} />
          <p class="text-gray-500 dark:text-gray-400 mt-2">Invoice creation coming soon!</p>
          <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">This feature is under development</p>
        </div>
      </div>
      
      <button
        onclick={() => showNewInvoiceForm = false}
        class="w-full mt-6 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        Close
      </button>
    </div>
  </div>
{/if}
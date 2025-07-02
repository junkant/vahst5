<!-- src/lib/components/client/ClientNotes.svelte -->
<!--
  @component ClientNotes
  @description Manages notes for a client with add, edit, and delete functionality
  @usage <ClientNotes {client} />
-->
<script lang="ts">
  import { useClients } from '$lib/stores/client.svelte';
  import { useToast } from '$lib/stores/toast.svelte';
  import { useAuth } from '$lib/stores/auth.svelte';
  import type { Client } from '$lib/stores/client.svelte';
  
  interface Note {
    id: string;
    text: string;
    createdAt: Date;
    createdBy: string;
    createdByEmail?: string;
  }
  
  interface Props {
    client: Client;
  }
  
  let { client }: Props = $props();
  
  const clients = useClients();
  const toast = useToast();
  const auth = useAuth();
  
  // State
  let notes = $state<Note[]>([]);
  let newNoteText = $state('');
  let isAddingNote = $state(false);
  let editingNoteId = $state<string | null>(null);
  let editingNoteText = $state('');
  let isSaving = $state(false);
  
  // Load notes from client data
  $effect(() => {
    if (client.notes) {
      try {
        // Parse notes if they're stored as JSON string
        const parsedNotes = typeof client.notes === 'string' 
          ? JSON.parse(client.notes) 
          : client.notes;
        notes = Array.isArray(parsedNotes) ? parsedNotes : [];
      } catch {
        // If parsing fails, treat as simple text
        notes = [{
          id: '1',
          text: client.notes as string,
          createdAt: new Date(client.updatedAt || client.createdAt),
          createdBy: 'Unknown',
          createdByEmail: ''
        }];
      }
    }
  });
  
  async function addNote() {
    if (!newNoteText.trim() || isSaving) return;
    
    isSaving = true;
    try {
      const newNote: Note = {
        id: Date.now().toString(),
        text: newNoteText.trim(),
        createdAt: new Date(),
        createdBy: auth.user?.displayName || auth.user?.email?.split('@')[0] || 'Unknown',
        createdByEmail: auth.user?.email
      };
      
      const updatedNotes = [...notes, newNote];
      await updateClientNotes(updatedNotes);
      
      notes = updatedNotes;
      newNoteText = '';
      isAddingNote = false;
      toast.success('Note added successfully');
    } catch (error) {
      toast.error('Failed to add note');
      console.error('Add note error:', error);
    } finally {
      isSaving = false;
    }
  }
  
  async function updateNote(noteId: string) {
    if (!editingNoteText.trim() || isSaving) return;
    
    isSaving = true;
    try {
      const updatedNotes = notes.map(note => 
        note.id === noteId 
          ? { ...note, text: editingNoteText.trim() }
          : note
      );
      
      await updateClientNotes(updatedNotes);
      
      notes = updatedNotes;
      editingNoteId = null;
      editingNoteText = '';
      toast.success('Note updated successfully');
    } catch (error) {
      toast.error('Failed to update note');
      console.error('Update note error:', error);
    } finally {
      isSaving = false;
    }
  }
  
  async function deleteNote(noteId: string) {
    if (!confirm('Are you sure you want to delete this note?') || isSaving) return;
    
    isSaving = true;
    try {
      const updatedNotes = notes.filter(note => note.id !== noteId);
      await updateClientNotes(updatedNotes);
      
      notes = updatedNotes;
      toast.success('Note deleted successfully');
    } catch (error) {
      toast.error('Failed to delete note');
      console.error('Delete note error:', error);
    } finally {
      isSaving = false;
    }
  }
  
  async function updateClientNotes(updatedNotes: Note[]) {
    await clients.updateClient(client.id, {
      notes: JSON.stringify(updatedNotes)
    });
  }
  
  function startEditingNote(note: Note) {
    editingNoteId = note.id;
    editingNoteText = note.text;
  }
  
  function cancelEditing() {
    editingNoteId = null;
    editingNoteText = '';
  }
  
  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
</script>

<div>
  <!-- Notes List -->
  {#if notes.length === 0 && !isAddingNote}
    <div class="text-center py-8">
      <svg class="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M11 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M11 5a2 2 0 002 2h2a2 2 0 002-2M11 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p class="text-gray-500 mb-4">No notes yet</p>
    </div>
  {:else}
    <div class="space-y-3 mb-4">
      {#each notes as note (note.id)}
        <div class="bg-gray-50 rounded-lg p-3">
          {#if editingNoteId === note.id}
            <!-- Edit Mode -->
            <div class="space-y-2">
              <textarea
                bind:value={editingNoteText}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                       focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows="3"
                disabled={isSaving}
                autofocus
              ></textarea>
              <div class="flex gap-2">
                <button
                  onclick={() => updateNote(note.id)}
                  class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 
                         transition-colors disabled:opacity-50"
                  disabled={isSaving || !editingNoteText.trim()}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onclick={cancelEditing}
                  class="px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300 
                         transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </div>
          {:else}
            <!-- View Mode -->
            <div class="space-y-2">
              <p class="text-gray-800 whitespace-pre-wrap">{note.text}</p>
              <div class="flex items-center justify-between">
                <p class="text-xs text-gray-500">
                  {note.createdBy} • {formatDate(note.createdAt)}
                </p>
                <div class="flex gap-1">
                  <button
                    onclick={() => startEditingNote(note)}
                    class="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200 
                           transition-colors"
                    aria-label="Edit note"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onclick={() => deleteNote(note.id)}
                    class="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-200 
                           transition-colors"
                    aria-label="Delete note"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
  
  <!-- Add Note Form -->
  {#if isAddingNote}
    <div class="border-t border-gray-200 pt-4">
      <textarea
        bind:value={newNoteText}
        placeholder="Add a note..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
               focus:ring-blue-500 focus:border-blue-500 resize-none"
        rows="3"
        disabled={isSaving}
        autofocus
      ></textarea>
      <div class="flex gap-2 mt-2">
        <button
          onclick={addNote}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                 transition-colors disabled:opacity-50 text-sm"
          disabled={isSaving || !newNoteText.trim()}
        >
          {isSaving ? 'Adding...' : 'Add Note'}
        </button>
        <button
          onclick={() => {
            isAddingNote = false;
            newNoteText = '';
          }}
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 
                 transition-colors text-sm"
          disabled={isSaving}
        >
          Cancel
        </button>
      </div>
    </div>
  {:else}
    <button
      onclick={() => isAddingNote = true}
      class="w-full py-2 border border-gray-300 rounded-lg text-gray-600 
             hover:border-gray-400 hover:text-gray-700 transition-colors 
             flex items-center justify-center gap-2"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Add Note
    </button>
  {/if}
</div>
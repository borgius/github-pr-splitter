<script lang="ts">
  import type { MouseEventHandler } from 'svelte/elements';

  export let actions: [string, MouseEventHandler<HTMLButtonElement>][] = [];

  const [title, handler] = actions.splice(0, 1)[0];
  const onClick = (handler: any) => (e: MouseEvent) => {
    handler(e);
    isOpen = false;
  };

  let isOpen = false;
</script>

<div class="BtnGroup position-relative {$$restProps.class || ''}">
  <button
    class="rounded-left-2 btn btn-sm BtnGroup-item"
    on:click={onClick(handler)}
  >
    {title}
  </button>

  {#if actions.length > 0}
    <button
      class="select-menu-button btn btn-sm BtnGroup-item"
      on:click={() => (isOpen = !isOpen)}
    />
  {/if}
  {#if isOpen}
    <details-menu
      class="dropdown-menu dropdown-menu-sw show-more-popover color-fg-default"
      style="width:185px"
      preload=""
      role="menu"
    >
      {#each actions as [title, handler]}
        <button
          class="dropdown-item btn-link"
          role="menuitem"
          on:click={onClick(handler)}
        >
          {title}
        </button>
      {/each}
    </details-menu>
  {/if}
</div>

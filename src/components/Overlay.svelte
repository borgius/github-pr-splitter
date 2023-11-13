<script lang="ts">
    import { onMount } from "svelte";
    import { storage } from "../storage";
    import Options from "./Options.svelte";

    let count = 0;

    onMount(() => {
        storage.get().then((storage) => (count = storage.count));
    });
</script>

<div class="overlay">
    <Options {count} />
</div>

<style>
    .overlay {
        position: fixed;
        width: 300px;
        top: 116px;
        left: 16px;
        background-color: rgb(255, 255, 255);
        border: 1px solid rgb(153, 71, 71);
        padding: 16px;
    }
</style>

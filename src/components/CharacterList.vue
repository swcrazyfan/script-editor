<template>
  <div class="character-list q-pa-md">
    <div class="text-h6 q-mb-md">Characters</div>
    <q-list>
      <q-item v-for="character in characters" :key="character.name">
        <q-item-section>
          {{ character.name }}
          <div class="text-caption text-grey">Lines: {{ character.lines }}</div>
        </q-item-section>
        <q-item-section side>
          <q-btn
            flat
            round
            dense
            icon="delete"
            size="sm"
            @click="removeCharacter(character.name)"
          >
            <q-tooltip>Remove character</q-tooltip>
          </q-btn>
        </q-item-section>
      </q-item>
      <q-item v-if="characters.length === 0">
        <q-item-section class="text-grey"> No characters yet </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useBlockStore } from "../stores/block-store";

const blockStore = useBlockStore();
const characters = computed(() => blockStore.characters);
const removeCharacter = (name) => {
  const characterBlocks = blockStore.getBlocksByType('CHARACTER');
  const characterBlock = characterBlocks.find(block => block.content.trim().toUpperCase() === name);
  if (characterBlock) {
    blockStore.removeBlock(characterBlock.id);
  }
};
</script>

<style scoped>
.character-list {
  height: 100%;
  background: #f5f5f5;
}
</style>

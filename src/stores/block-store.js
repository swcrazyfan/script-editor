import { defineStore } from "pinia";

export const useBlockStore = defineStore("block", {
  state: () => ({
    blockCounter: 0,
    blocksByType: {},
    blockRelations: new Map(), // Tracks relationships between blocks
  }),

  getters: {
    characters() {
      const characterBlocks = this.blocksByType['CHARACTER'] || [];
      const characterMap = new Map();

      characterBlocks.forEach(block => {
        const name = block.content.trim().toUpperCase();
        if (name) {
          const dialogueBlocks = this.getRelatedBlocks(block.id);
          const existingChar = characterMap.get(name);
          // Only count the character block itself as a line, not the dialogue blocks
          const lines = 1;
          
          if (existingChar) {
            characterMap.set(name, { 
              lines: existingChar.lines + lines,
              blocks: [...existingChar.blocks, block.id]
            });
          } else {
            characterMap.set(name, { lines, blocks: [block.id] });
          }
        }
      });

      return Array.from(characterMap.entries())
        .map(([name, data]) => ({ name, lines: data.lines }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  },

  actions: {
    generateBlockId(blockType) {
      const id = `${blockType}_${++this.blockCounter}`;
      if (!this.blocksByType[blockType]) {
        this.blocksByType[blockType] = [];
      }
      return id;
    },

    addBlock(blockType, content = "", relatedBlockId = null) {
      const blockId = this.generateBlockId(blockType);
      
      // Add the block to blocksByType
      if (!this.blocksByType[blockType]) {
        this.blocksByType[blockType] = [];
      }
      
      const block = {
        id: blockId,
        content,
        createdAt: new Date(),
      };
      
      this.blocksByType[blockType].push(block);

      // If this block is related to another block, store the relationship
      if (relatedBlockId) {
        this.blockRelations.set(blockId, relatedBlockId);
      }

      return blockId;
    },

    getBlocksByType(blockType) {
      return this.blocksByType[blockType] || [];
    },

    getBlock(blockId) {
      for (const blocks of Object.values(this.blocksByType)) {
        const block = blocks.find(b => b.id === blockId);
        if (block) return block;
      }
      return null;
    },

    updateBlock(blockId, content) {
      for (const blocks of Object.values(this.blocksByType)) {
        const block = blocks.find(b => b.id === blockId);
        if (block) {
          block.content = content;
          return true;
        }
      }
      return false;
    },

    removeBlock(blockId) {
      for (const [type, blocks] of Object.entries(this.blocksByType)) {
        const index = blocks.findIndex(b => b.id === blockId);
        if (index !== -1) {
          blocks.splice(index, 1);
          // Remove any relationships involving this block
          this.blockRelations.delete(blockId);
          for (const [key, value] of this.blockRelations.entries()) {
            if (value === blockId) {
              this.blockRelations.delete(key);
            }
          }
          return true;
        }
      }
      return false;
    },

    getRelatedBlock(blockId) {
      return this.blockRelations.get(blockId);
    },

    getRelatedBlocks(blockId) {
      const relatedBlocks = [];
      for (const [key, value] of this.blockRelations.entries()) {
        if (value === blockId) {
          relatedBlocks.push(key);
        }
      }
      return relatedBlocks;
    },

    clearBlocks() {
      this.blocksByType = {};
      this.blockRelations.clear();
      // Don't reset blockCounter to maintain unique IDs
    },

    getAllBlocks() {
      return this.blocksByType;
    },
  },
});
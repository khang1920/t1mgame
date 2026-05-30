class MemorySystem {
    constructor(animalId) {
        this.animalId = animalId;
        this.memories = [];
        this.maxMemories = 50;
    }

    addMemory(type, value, position, context = {}) {
        // Kiểm tra ký ức trùng lặp
        const existingMem = this.memories.find(m => 
            m.type === type && 
            Math.abs(m.position.x - position.x) < 30 && 
            Math.abs(m.position.y - position.y) < 30
        );

        if (existingMem) {
            existingMem.strength = Math.min(1, existingMem.strength + 0.2);
            existingMem.timestamp = world.currentDay;
            existingMem.value = (existingMem.value + value) / 2; // Cập nhật giá trị trung bình
            return;
        }

        // Tạo ký ức mới
        const memory = {
            id: Date.now() + Math.random(),
            type: type,
            value: value,
            position: { x: position.x, y: position.y },
            timestamp: world.currentDay,
            strength: 1.0,
            context: context,
            emotionalTag: null // Gắn tag cảm xúc (tốt/xấu)
        };

        // Thêm tag cảm xúc
        if (type === 'food' && value > 50) memory.emotionalTag = 'joy';
        if (type === 'danger') memory.emotionalTag = 'fear';
        if (type === 'water') memory.emotionalTag = 'relief';

        this.memories.push(memory);

        // Giới hạn số lượng ký ức
        if (this.memories.length > this.maxMemories) {
            // Xóa ký ức yếu nhất
            this.memories.sort((a, b) => a.strength - b.strength);
            this.memories.shift();
        }
    }

    getMemoriesByType(type, limit = 10) {
        return this.memories
            .filter(m => m.type === type)
            .sort((a, b) => b.strength - a.strength)
            .slice(0, limit);
    }

    getRecentMemories(hours = 24) {
        const currentDay = world.currentDay;
        const currentHour = world.currentHour;
        const timeThreshold = currentDay * 24 + currentHour - hours;
        
        return this.memories.filter(m => {
            const memTime = m.timestamp * 24;
            return memTime >= timeThreshold;
        });
    }

    getEmotionalMemories(emotion) {
        return this.memories.filter(m => m.emotionalTag === emotion);
    }

    decayMemories(rate = 0.01) {
        this.memories.forEach(m => {
            m.strength = Math.max(0, m.strength - rate);
        });
        
        // Xóa ký ức quá yếu
        this.memories = this.memories.filter(m => m.strength > 0.1);
    }

    // Tìm đường đi dựa trên ký ức
    findBestPath(targetType, currentPosition) {
        const relevantMemories = this.getMemoriesByType(targetType, 5);
        
        if (relevantMemories.length === 0) return null;
        
        // Chọn ký ức tốt nhất dựa trên strength và khoảng cách
        return relevantMemories.reduce((best, mem) => {
            const distance = Math.sqrt(
                Math.pow(mem.position.x - currentPosition.x, 2) +
                Math.pow(mem.position.y - currentPosition.y, 2)
            );
            const score = mem.strength / (distance + 1);
            return score > (best.score || 0) ? { ...mem, score } : best;
        }, {});
    }

    // Học từ kinh nghiệm của sinh vật khác (social learning)
    learnFromOthers(otherMemories, trustLevel = 0.5) {
        otherMemories.forEach(mem => {
            const reducedStrength = mem.strength * trustLevel;
            if (reducedStrength > 0.3) {
                this.addMemory(mem.type, mem.value, mem.position, {
                    learnedFrom: 'social',
                    originalStrength: mem.strength
                });
            }
        });
    }

    // Xuất dữ liệu trí nhớ
    exportMemories() {
        return this.memories.map(m => ({
            type: m.type,
            value: m.value,
            position: m.position,
            strength: m.strength,
            emotionalTag: m.emotionalTag
        }));
    }

    // Nhập dữ liệu trí nhớ (khi load game)
    importMemories(data) {
        this.memories = data.map(d => ({
            ...d,
            id: Date.now() + Math.random(),
            timestamp: world.currentDay,
            context: {}
        }));
    }
}

// Xuất cho global scope
window.MemorySystem = MemorySystem;

class World {
    constructor() {
        this.width = 1200;
        this.height = 800;
        this.currentDay = 1;
        this.currentHour = 0;
        this.season = 'Xuân';
        this.timeSpeed = 1;
        this.isPaused = false;
        this.totalTime = 0;
        
        // Collections
        this.animals = [];
        this.resources = [];
        this.events = [];
        
        // Hệ thống
        this.resourceSystem = new ResourceSystem(this);
        this.nextAnimalId = 1;
        
        // Địa hình
        this.terrain = this.generateTerrain();
        
        // Disaster
        this.disasterActive = false;
        this.disasterTimer = 0;
        
        this.initialize();
    }

    initialize() {
        // Tạo địa hình
        this.terrain = this.generateTerrain();
        
        // Tạo tài nguyên ban đầu
        for (let i = 0; i < 80; i++) {
            this.resources.push(this.resourceSystem.createRandomResource());
        }
        
        // Tạo sinh vật ban đầu
        for (let i = 0; i < 15; i++) {
            this.addAnimal();
        }
        
        this.addEvent('🌍 Thế giới đã được khởi tạo với 15 sinh vật có ý thức');
    }

    generateTerrain() {
        return {
            forests: [
                { x: 0, y: 0, width: 400, height: 300 },
                { x: 800, y: 500, width: 400, height: 300 }
            ],
            lakes: [
                { x: 500, y: 100, radius: 80 },
                { x: 200, y: 500, radius: 60 }
            ],
            rivers: [
                { start: { x: 300, y: 800 }, end: { x: 600, y: 200 }, width: 15 }
            ],
            mountains: [
                { x: 900, y: 300, radius: 100 }
            ],
            plains: [
                { x: 600, y: 200, width: 300, height: 300 }
            ]
        };
    }

    update(deltaTime) {
        if (this.isPaused) return;
        
        const scaledDelta = deltaTime * this.timeSpeed;
        this.totalTime += scaledDelta;
        
        // Cập nhật thời gian
        this.updateTime(scaledDelta);
        
        // Cập nhật tài nguyên
        this.resourceSystem.update(scaledDelta);
        
        // Cập nhật sinh vật
        this.animals.forEach(animal => animal.update(scaledDelta));
        
        // Kiểm tra thảm họa
        if (this.disasterActive) {
            this.updateDisaster(scaledDelta);
        }
        
        // Tự động lưu mỗi 5 phút (thời gian thực)
        if (Math.floor(this.totalTime) % 300 === 0) {
            this.autoSave();
        }
    }

    updateTime(deltaTime) {
        // 1 giây thực = 1 giờ trong game (với speed 1x)
        this.currentHour += deltaTime;
        while (this.currentHour >= 24) {
            this.currentHour -= 24;
            this.currentDay++;
            this.updateSeason();
            this.dailyEvents();
        }
    }

    updateSeason() {
        const dayInYear = this.currentDay % 40;
        const oldSeason = this.season;
        
        if (dayInYear < 10) this.season = 'Xuân';
        else if (dayInYear < 20) this.season = 'Hạ';
        else if (dayInYear < 30) this.season = 'Thu';
        else this.season = 'Đông';
        
        if (oldSeason !== this.season) {
            this.addEvent(`🌡️ Mùa mới: ${this.season}`);
        }
    }

    dailyEvents() {
        // Sự kiện hàng ngày
        this.animals.forEach(animal => {
            // Phân rã trí nhớ
            animal.memory.decayMemories(0.01);
            
            // Cập nhật tuổi
            if (animal.age > animal.maxAge * 0.8) {
                animal.health -= 5; // Già yếu
            }
        });
        
        // Tái tạo tài nguyên
        this.resourceSystem.regenerateResources();
        
        // Random events
        if (Math.random() < 0.1) {
            this.randomEvent();
        }
    }

    randomEvent() {
        const events = [
            { name: 'Mưa lớn', effect: () => this.resourceSystem.spawnWaterSources() },
            { name: 'Hạn hán', effect: () => this.resourceSystem.removeWaterSources() },
            { name: 'Mùa quả chín', effect: () => this.resourceSystem.spawnFruits() },
            { name: 'Di cư', effect: () => this.addAnimal() }
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        event.effect();
        this.addEvent(`🌍 Sự kiện: ${event.name}`);
    }

    addAnimal(parent1 = null, parent2 = null) {
        const x = Math.random() * this.width;
        const y = Math.random() * this.height;
        const animal = new Animal(this.nextAnimalId++, x, y, this);
        
        if (parent1 && parent2) {
            // Kết hợp gene từ cha mẹ
            animal.personality = this.combineGenes(parent1, parent2);
            animal.generation = Math.max(parent1.generation, parent2.generation) + 1;
            animal.parents = [parent1.id, parent2.id];
            
            // Di truyền kiến thức
            animal.learning.inheritKnowledge(parent1.learning.exportKnowledge());
            
            // Di truyền một phần trí nhớ
            animal.memory.learnFromOthers(parent1.memory.memories, 0.3);
            animal.memory.learnFromOthers(parent2.memory.memories, 0.3);
        }
        
        this.animals.push(animal);
        this.addEvent(`🐣 ${animal.getName()} đã được sinh ra`);
        
        return animal;
    }

    combineGenes(parent1, parent2) {
        const personality = {};
        Object.keys(parent1.personality).forEach(key => {
            // Kết hợp với đột biến
            const base = Math.random() < 0.5 ? parent1.personality[key] : parent2.personality[key];
            personality[key] = Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.2));
        });
        return personality;
    }

    createOffspring(parent1, parent2) {
        const child = this.addAnimal(parent1, parent2);
        parent1.offspring.push(child.id);
        parent2.offspring.push(child.id);
        
        this.addEvent(`💕 Sinh vật mới được sinh ra từ #${parent1.id} và #${parent2.id}`);
    }

    removeAnimal(animal) {
        const index = this.animals.indexOf(animal);
        if (index > -1) {
            this.animals.splice(index, 1);
        }
    }

    getAnimalById(id) {
        return this.animals.find(a => a.id === id);
    }

    getNearbyAnimals(animal, radius) {
        return this.animals.filter(a => {
            if (a === animal) return false;
            const dx = a.x - animal.x;
            const dy = a.y - animal.y;
            return Math.sqrt(dx * dx + dy * dy) < radius;
        });
    }

    getNearestAnimal(animal, maxDist = Infinity) {
        let nearest = null;
        let minDist = maxDist;
        
        this.animals.forEach(a => {
            if (a === animal) return;
            const dx = a.x - animal.x;
            const dy = a.y - animal.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist) {
                minDist = dist;
                nearest = a;
            }
        });
        
        return nearest;
    }

    getResourceAt(x, y, type = null) {
        return this.resources.find(r => {
            const dx = r.x - x;
            const dy = r.y - y;
            const near = Math.sqrt(dx * dx + dy * dy) < 20;
            return near && (!type || r.type === type);
        });
    }

    consumeResource(resource) {
        const index = this.resources.indexOf(resource);
        if (index > -1) {
            this.resources.splice(index, 1);
        }
    }

    getNearestWaterSource(x, y) {
        let nearest = null;
        let minDist = Infinity;
        
        // Kiểm tra hồ
        this.terrain.lakes.forEach(lake => {
            const dx = lake.x - x;
            const dy = lake.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy) - lake.radius;
            if (dist < minDist) {
                minDist = dist;
                nearest = { x: lake.x, y: lake.y };
            }
        });
        
        // Kiểm tra sông
        this.terrain.rivers.forEach(river => {
            const midX = (river.start.x + river.end.x) / 2;
            const midY = (river.start.y + river.end.y) / 2;
            const dx = midX - x;
            const dy = midY - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                nearest = { x: midX, y: midY };
            }
        });
        
        return nearest || { x: Math.random() * this.width, y: Math.random() * this.height };
    }

    // Điều khiển
    setTimeSpeed(speed) {
        this.timeSpeed = speed;
        this.isPaused = speed === 0;
    }

    toggleDisaster() {
        this.disasterActive = !this.disasterActive;
        if (this.disasterActive) {
            this.disasterTimer = 10; // 10 giây
            this.addEvent('🌪️ THẢM HỌA: Bão lớn đang đến!');
        }
    }

    updateDisaster(deltaTime) {
        this.disasterTimer -= deltaTime;
        if (this.disasterTimer <= 0) {
            this.disasterActive = false;
            this.addEvent('🌈 Thảm họa đã qua');
            return;
        }
        
        // Ảnh hưởng đến sinh vật
        this.animals.forEach(animal => {
            animal.fear = 100;
            animal.health -= deltaTime * 10;
        });
    }

    addResourceBurst() {
        for (let i = 0; i < 20; i++) {
            this.resources.push(this.resourceSystem.createRandomResource());
        }
        this.addEvent('🌱 Bùng nổ tài nguyên! 20 tài nguyên mới xuất hiện');
    }

    reset() {
        this.animals = [];
        this.resources = [];
        this.events = [];
        this.currentDay = 1;
        this.currentHour = 0;
        this.nextAnimalId = 1;
        this.initialize();
        this.addEvent('🔄 Thế giới đã được reset');
    }

    addEvent(message) {
        const time = `Ngày ${this.currentDay} - ${String(Math.floor(this.currentHour)).padStart(2, '0')}:00`;
        this.events.push({ time, message });
        
        // Giới hạn log
        if (this.events.length > 100) {
            this.events.shift();
        }
        
        // Cập nhật UI nếu có
        if (window.updateEventLog) {
            window.updateEventLog(time, message);
        }
    }

    autoSave() {
        const saveData = {
            day: this.currentDay,
            hour: this.currentHour,
            season: this.season,
            animals: this.animals.map(a => a.exportData()),
            resources: this.resources,
            events: this.events.slice(-50),
            timestamp: Date.now()
        };
        
        localStorage.setItem('world_simulation_save', JSON.stringify(saveData));
    }

    load() {
        const saveData = localStorage.getItem('world_simulation_save');
        if (!saveData) return false;
        
        try {
            const data = JSON.parse(saveData);
            this.currentDay = data.day;
            this.currentHour = data.hour;
            this.season = data.season;
            this.resources = data.resources;
            this.events = data.events;
            
            // Khôi phục sinh vật
            this.animals = data.animals.map(animalData => {
                const animal = new Animal(animalData.id, animalData.x, animalData.y, this);
                Object.assign(animal, animalData);
                animal.memory.importMemories(animalData.memories);
                return animal;
            });
            
            this.nextAnimalId = Math.max(...this.animals.map(a => a.id)) + 1;
            this.addEvent('📂 Đã tải thế giới từ bộ nhớ');
            return true;
        } catch (e) {
            console.error('Lỗi load game:', e);
            return false;
        }
    }
}

window.World = World;

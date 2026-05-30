class Animal {
    constructor(id, x, y, world) {
        this.id = id;
        this.world = world;
        
        // Vị trí và vật lý
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.speed = 1 + Math.random() * 2;
        this.size = 8;
        this.direction = Math.random() * Math.PI * 2;
        
        // Chỉ số sinh tồn
        this.health = 100;
        this.hunger = Math.random() * 50;
        this.thirst = Math.random() * 30;
        this.energy = 100;
        this.age = 0; // Ngày tuổi
        this.maxAge = 50 + Math.random() * 30;
        
        // Tâm lý và cảm xúc
        this.fear = 0;
        this.curiosity = 30 + Math.random() * 40;
        this.happiness = 50;
        this.socialNeed = Math.random() * 100;
        
        // Tính cách (gene)
        this.personality = {
            boldness: Math.random(),
            sociability: Math.random(),
            curiosity: Math.random(),
            aggression: Math.random() * 0.3,
            intelligence: 0.3 + Math.random() * 0.7
        };
        
        // Trạng thái
        this.state = 'idle'; // idle, exploring, foraging, drinking, fleeing, mating, resting
        this.target = null;
        this.targetType = null;
        
        // Hệ thống trí tuệ
        this.memory = new MemorySystem(id);
        this.learning = new LearningSystem(id);
        
        // Xã hội
        this.relationships = new Map(); // Quan hệ với sinh vật khác
        this.offspring = [];
        this.parents = [];
        
        // Gene và di truyền
        this.generation = 0;
        this.mutations = [];
        
        // Thống kê
        this.stats = {
            foodEaten: 0,
            waterDrunk: 0,
            distanceTraveled: 0,
            interactions: 0,
            offspringCount: 0,
            dangersSurvived: 0
        };
        
        // Timer nội bộ
        this.lastActionTime = 0;
        this.actionCooldown = 0;
    }

    // Cập nhật mỗi frame
    update(deltaTime) {
        this.age += deltaTime / (24 * 60); // Convert deltaTime to days
        
        // Cập nhật chỉ số
        this.updateVitals(deltaTime);
        
        // Cập nhật cảm xúc
        this.updateEmotions();
        
        // Ra quyết định
        this.makeDecision();
        
        // Thực hiện hành động
        this.executeAction(deltaTime);
        
        // Di chuyển
        this.move(deltaTime);
        
        // Kiểm tra tử vong
        if (this.shouldDie()) {
            this.die();
        }
    }

    updateVitals(deltaTime) {
        const dayLength = 24 * 60; // Minutes in a day
        const rate = deltaTime / dayLength;
        
        // Tăng đói và khát theo thời gian
        this.hunger = Math.min(100, this.hunger + 0.5 * rate * 100);
        this.thirst = Math.min(100, this.thirst + 0.7 * rate * 100);
        
        // Giảm năng lượng
        const energyCost = this.state === 'resting' ? 0.3 : 
                          this.state === 'fleeing' ? 2 : 1;
        this.energy = Math.max(0, this.energy - energyCost * rate * 100);
        
        // Ảnh hưởng của đói khát đến sức khỏe
        if (this.hunger > 80) this.health -= 0.5 * rate * 100;
        if (this.thirst > 90) this.health -= 0.8 * rate * 100;
        
        // Hồi phục khi nghỉ ngơi
        if (this.state === 'resting' && this.hunger < 50 && this.thirst < 50) {
            this.health = Math.min(100, this.health + 1 * rate * 100);
            this.energy = Math.min(100, this.energy + 2 * rate * 100);
        }
    }

    updateEmotions() {
        // Sợ hãi dựa trên ký ức nguy hiểm
        const recentDangers = this.memory.getEmotionalMemories('fear');
        this.fear = Math.min(100, recentDangers.length * 20 * (1 - this.personality.boldness));
        
        // Hạnh phúc dựa trên nhu cầu được đáp ứng
        this.happiness = 100 - (this.hunger * 0.5 + this.thirst * 0.3 + this.fear * 0.2);
        
        // Tò mò
        this.curiosity = this.personality.curiosity * (100 - this.fear) / 100;
    }

    makeDecision() {
        // Hệ thống ưu tiên (Priority-based Decision Making)
        const priorities = [
            { condition: () => this.health < 20, state: 'resting', priority: 100 },
            { condition: () => this.fear > 70, state: 'fleeing', priority: 90 },
            { condition: () => this.thirst > 70, state: 'drinking', priority: 80 },
            { condition: () => this.hunger > 70, state: 'foraging', priority: 75 },
            { condition: () => this.socialNeed > 80 && this.energy > 50, state: 'mating', priority: 60 },
            { condition: () => this.curiosity > 50 && this.energy > 30, state: 'exploring', priority: 40 },
            { condition: () => this.energy < 20, state: 'resting', priority: 30 }
        ];

        // Sắp xếp theo priority và chọn
        priorities.sort((a, b) => b.priority - a.priority);
        
        for (const p of priorities) {
            if (p.condition() && this.state !== p.state) {
                this.changeState(p.state);
                break;
            }
        }
    }

    changeState(newState) {
        this.state = newState;
        this.target = null;
        
        switch (newState) {
            case 'foraging':
                this.findFood();
                break;
            case 'drinking':
                this.findWater();
                break;
            case 'exploring':
                this.findExploreTarget();
                break;
            case 'fleeing':
                this.findSafePlace();
                break;
            case 'mating':
                this.findMate();
                break;
        }
    }

    findFood() {
        // Sử dụng trí nhớ để tìm thức ăn
        const bestMemory = this.memory.findBestPath('food', { x: this.x, y: this.y });
        
        if (bestMemory && Math.random() < this.personality.intelligence) {
            this.target = bestMemory.position;
            this.targetType = 'food';
        } else {
            // Tìm ngẫu nhiên
            this.target = this.getRandomPosition();
            this.targetType = 'random_search';
        }
    }

    findWater() {
        const bestMemory = this.memory.findBestPath('water', { x: this.x, y: this.y });
        
        if (bestMemory) {
            this.target = bestMemory.position;
            this.targetType = 'water';
        } else {
            this.target = this.world.getNearestWaterSource(this.x, this.y);
            this.targetType = 'water';
        }
    }

    findExploreTarget() {
        // Khám phá nơi chưa từng đến
        const knownPositions = this.memory.getMemoriesByType('location', 20);
        let bestPos = null;
        let maxDistance = 0;
        
        for (let i = 0; i < 5; i++) {
            const randomPos = this.getRandomPosition();
            let minDist = Infinity;
            
            knownPositions.forEach(mem => {
                const dist = Math.sqrt(
                    Math.pow(mem.position.x - randomPos.x, 2) +
                    Math.pow(mem.position.y - randomPos.y, 2)
                );
                minDist = Math.min(minDist, dist);
            });
            
            if (minDist > maxDistance) {
                maxDistance = minDist;
                bestPos = randomPos;
            }
        }
        
        this.target = bestPos || this.getRandomPosition();
        this.targetType = 'explore';
    }

    findSafePlace() {
        // Chạy ngược hướng nguy hiểm
        const dangers = this.memory.getEmotionalMemories('fear');
        if (dangers.length > 0) {
            const avgDanger = {
                x: dangers.reduce((sum, d) => sum + d.position.x, 0) / dangers.length,
                y: dangers.reduce((sum, d) => sum + d.position.y, 0) / dangers.length
            };
            
            const dx = this.x - avgDanger.x;

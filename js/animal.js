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
            const dy = this.y - avgDanger.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            this.target = {
                x: this.x + (dx / dist) * 200,
                y: this.y + (dy / dist) * 200
            };
            this.targetType = 'safe_place';
        }
    }

    findMate() {
        // Tìm bạn tình gần nhất
        const nearbyAnimals = this.world.getNearbyAnimals(this, 100);
        const potentialMates = nearbyAnimals.filter(a => 
            a !== this && 
            Math.abs(a.age - this.age) < 10 &&
            a.health > 50 &&
            a.state !== 'fleeing'
        );
        
        if (potentialMates.length > 0) {
            const mate = potentialMates[Math.floor(Math.random() * potentialMates.length)];
            this.target = { x: mate.x, y: mate.y };
            this.targetType = 'mate';
        }
    }

    executeAction(deltaTime) {
        if (!this.target) return;
        
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 10) {
            // Đến nơi
            this.performAction();
            this.target = null;
        }
    }

    performAction() {
        switch (this.state) {
            case 'foraging':
                this.eat();
                break;
            case 'drinking':
                this.drink();
                break;
            case 'exploring':
                this.learn();
                break;
            case 'mating':
                this.mate();
                break;
        }
    }

    eat() {
        // Kiểm tra có thức ăn tại vị trí không
        const food = this.world.getResourceAt(this.x, this.y, 'food');
        if (food) {
            const foodValue = food.value;
            this.hunger = Math.max(0, this.hunger - foodValue * 0.5);
            this.stats.foodEaten++;
            
            // Học hỏi
            this.memory.addMemory('food', foodValue, { x: this.x, y: this.y }, {
                type: food.type,
                season: this.world.season
            });
            
            this.learning.learn({
                action: 'find_food',
                result: { success: true, reward: foodValue },
                context: 'foraging'
            });
            
            // Tiêu thụ tài nguyên
            this.world.consumeResource(food);
        }
    }

    drink() {
        const water = this.world.getResourceAt(this.x, this.y, 'water');
        if (water) {
            this.thirst = Math.max(0, this.thirst - 30);
            this.stats.waterDrunk++;
            
            this.memory.addMemory('water', 30, { x: this.x, y: this.y });
        }
    }

    learn() {
        // Học về môi trường xung quanh
        this.memory.addMemory('location', 0, { x: this.x, y: this.y });
        
        // Tăng kỹ năng navigation
        this.learning.skills.navigation += 0.01;
        
        // Học từ các sinh vật gần đó
        const nearby = this.world.getNearbyAnimals(this, 50);
        nearby.forEach(other => {
            if (Math.random() < this.personality.intelligence * 0.5) {
                this.memory.learnFromOthers(other.memory.memories, 0.3);
            }
        });
    }

    mate() {
        const mate = this.world.getNearestAnimal(this, 20);
        if (mate && mate !== this && mate.state === 'mating') {
            // Sinh sản
            this.world.createOffspring(this, mate);
            this.stats.offspringCount++;
            this.socialNeed = 0;
            this.happiness = 100;
            
            // Ghi nhớ bạn tình
            this.memory.addMemory('mate', mate.id, { x: mate.x, y: mate.y });
            this.relationships.set(mate.id, {
                type: 'mate',
                strength: 0.8,
                lastInteraction: this.world.currentDay
            });
        }
    }

    move(deltaTime) {
        if (!this.target) {
            // Di chuyển ngẫu nhiên khi không có mục tiêu
            this.direction += (Math.random() - 0.5) * 0.5;
            this.vx = Math.cos(this.direction) * this.speed * 0.3;
            this.vy = Math.sin(this.direction) * this.speed * 0.3;
        } else {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                this.direction = Math.atan2(dy, dx);
                this.vx = (dx / dist) * this.speed;
                this.vy = (dy / dist) * this.speed;
            }
        }
        
        // Cập nhật vị trí
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;
        
        // Giới hạn trong thế giới
        this.x = Math.max(0, Math.min(this.world.width, this.x));
        this.y = Math.max(0, Math.min(this.world.height, this.y));
        
        this.stats.distanceTraveled += Math.abs(this.vx) + Math.abs(this.vy);
    }

    shouldDie() {
        return this.health <= 0 || 
               this.age > this.maxAge || 
               this.hunger >= 100 || 
               this.thirst >= 100;
    }

    die() {
        // Trước khi chết, để lại "di sản" kiến thức cho con cháu
        if (this.offspring.length > 0) {
            this.offspring.forEach(childId => {
                const child = this.world.getAnimalById(childId);
                if (child) {
                    child.memory.learnFromOthers(this.memory.memories, 0.5);
                }
            });
        }
        
        // Thêm vào sự kiện thế giới
        this.world.addEvent(`${this.getName()} đã qua đời ở tuổi ${Math.floor(this.age)} ngày`);
        
        // Xóa khỏi thế giới
        this.world.removeAnimal(this);
    }

    getRandomPosition() {
        return {
            x: Math.random() * this.world.width,
            y: Math.random() * this.world.height
        };
    }

    getName() {
        return `Sinh vật #${this.id}`;
    }

    // Xuất dữ liệu để lưu game
    exportData() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            health: this.health,
            hunger: this.hunger,
            thirst: this.thirst,
            energy: this.energy,
            age: this.age,
            personality: this.personality,
            state: this.state,
            stats: this.stats,
            generation: this.generation,
            memories: this.memory.exportMemories(),
            knowledge: this.learning.exportKnowledge()
        };
    }
}

window.Animal = Animal;

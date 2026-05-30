class LearningSystem {
    constructor(animalId) {
        this.animalId = animalId;
        this.knowledgeBase = new Map(); // Kiến thức đã học
        this.skills = {
            foraging: 0.3,    // Kỹ năng tìm thức ăn
            navigation: 0.2,  // Kỹ năng di chuyển
            social: 0.1,      // Kỹ năng xã hội
            survival: 0.2,    // Kỹ năng sinh tồn
            memory: 0.3       // Khả năng ghi nhớ
        };
        this.experiences = [];
        this.learnedBehaviors = new Set();
    }

    // Học từ một trải nghiệm
    learn(experience) {
        const { action, result, context } = experience;
        
        // Lưu trải nghiệm
        this.experiences.push({
            ...experience,
            timestamp: world.currentDay * 24 + world.currentHour
        });

        // Cập nhật kiến thức
        const key = `${action}_${context || 'general'}`;
        if (!this.knowledgeBase.has(key)) {
            this.knowledgeBase.set(key, {
                attempts: 0,
                successes: 0,
                totalReward: 0
            });
        }

        const knowledge = this.knowledgeBase.get(key);
        knowledge.attempts++;
        if (result.success) {
            knowledge.successes++;
            knowledge.totalReward += result.reward || 0;
        }

        // Học kỹ năng mới
        this.updateSkills(experience);
        
        // Học hành vi mới
        if (result.success && result.newBehavior) {
            this.learnedBehaviors.add(result.newBehavior);
        }
    }

    updateSkills(experience) {
        const skillMapping = {
            'find_food': 'foraging',
            'find_water': 'survival',
            'explore': 'navigation',
            'interact': 'social',
            'remember': 'memory'
        };

        const skill = skillMapping[experience.action];
        if (skill && experience.result.success) {
            this.skills[skill] = Math.min(1, this.skills[skill] + 0.05);
        } else if (skill && !experience.result.success) {
            this.skills[skill] = Math.max(0.1, this.skills[skill] - 0.02);
        }
    }

    // Ra quyết định dựa trên kiến thức đã học
    decideAction(availableActions, state) {
        const scoredActions = availableActions.map(action => {
            const key = `${action}_${state}`;
            const knowledge = this.knowledgeBase.get(key);
            
            if (!knowledge || knowledge.attempts === 0) {
                return { action, score: 0.5 }; // Không có kiến thức, 50/50
            }

            const successRate = knowledge.successes / knowledge.attempts;
            const avgReward = knowledge.totalReward / knowledge.attempts;
            const explorationBonus = 1 / (knowledge.attempts + 1); // Khuyến khích thử cái mới
            
            return {
                action,
                score: successRate * 0.6 + avgReward * 0.3 + explorationBonus * 0.1
            };
        });

        // Chọn action có điểm cao nhất (với một chút randomness)
        scoredActions.sort((a, b) => b.score - a.score);
        
        if (Math.random() < 0.8) { // 80% chọn tốt nhất
            return scoredActions[0].action;
        } else {
            return scoredActions[Math.floor(Math.random() * scoredActions.length)].action;
        }
    }

    // Dự đoán kết quả
    predictOutcome(action, context) {
        const key = `${action}_${context}`;
        const knowledge = this.knowledgeBase.get(key);
        
        if (!knowledge || knowledge.attempts === 0) {
            return { successProbability: 0.5, expectedReward: 0 };
        }

        return {
            successProbability: knowledge.successes / knowledge.attempts,
            expectedReward: knowledge.totalReward / knowledge.attempts
        };
    }

    // Học từ quan sát (observational learning)
    learnFromObservation(otherAnimal, action, result) {
        const trustLevel = this.skills.social;
        if (Math.random() < trustLevel) {
            this.learn({
                action: action,
                result: { ...result, reward: result.reward * 0.7 }, // Giảm reward khi học gián tiếp
                context: 'observed',
                source: otherAnimal.id
            });
        }
    }

    // Xuất kiến thức
    exportKnowledge() {
        return {
            skills: { ...this.skills },
            knowledge: Array.from(this.knowledgeBase.entries()),
            learnedBehaviors: Array.from(this.learnedBehaviors)
        };
    }

    // Di truyền kiến thức cho con cái
    inheritKnowledge(parentKnowledge, mutationRate = 0.1) {
        // Kết hợp kiến thức của cha mẹ với đột biến
        this.skills = { ...parentKnowledge.skills };
        Object.keys(this.skills).forEach(key => {
            this.skills[key] += (Math.random() - 0.5) * mutationRate;
            this.skills[key] = Math.max(0.1, Math.min(1, this.skills[key]));
        });
    }
}

window.LearningSystem = LearningSystem;

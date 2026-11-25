package com.zephyr.manager27.data

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase

@Entity(tableName = "clubs")
data class ClubEntity(
    @PrimaryKey val id: String,
    val fictionalName: String,
    val realName: String,
    val transferBudgetEur: Long,
    val wageCapWeeklyEur: Long,
    val primaryHex: String,
    val secondaryHex: String,
    val realBadgeUrl: String
)

@Entity(tableName = "players")
data class PlayerEntity(
    @PrimaryKey val id: String,
    val clubId: String,
    val fictionalName: String,
    val realName: String,
    val age: Int,
    val role: String,
    val ovr: Int,
    val potential: Int,
    val condition: Int,
    val injuredWeeks: Int,
    val marketValueEur: Long,
    val weeklyWageEur: Long
)

@Entity(tableName = "career_state")
data class CareerStateEntity(
    @PrimaryKey val id: Int = 1,
    val managedClubId: String,
    val currentWeek: Int,
    val isFullLicensed: Boolean
)

@Dao
interface ZephyrDao {
    @Query("SELECT * FROM clubs")
    suspend fun getAllClubs(): List<ClubEntity>

    @Query("SELECT * FROM players WHERE clubId = :clubId ORDER BY ovr DESC")
    suspend fun getSquad(clubId: String): List<PlayerEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertClubs(clubs: List<ClubEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertPlayers(players: List<PlayerEntity>)

    @Query("SELECT * FROM career_state WHERE id = 1")
    suspend fun getCareerState(): CareerStateEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveCareerState(state: CareerStateEntity)
}

@Database(
    entities = [ClubEntity::class, PlayerEntity::class, CareerStateEntity::class],
    version = 1,
    exportSchema = false
)
abstract class ZephyrDatabase : RoomDatabase() {
    abstract fun zephyrDao(): ZephyrDao
}
